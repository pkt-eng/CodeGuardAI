using System;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using CodeGuardAI.WebAPI.Data;
using CodeGuardAI.WebAPI.Models;

namespace CodeGuardAI.WebAPI.Services;

public interface IGitHubFixerService
{
    Task ProcessActionFailureAsync(string repo, string branch, string commitSha, string runId, string errorMessage, string pusherName = "", string pusherEmail = "");
    Task MergePullRequestAsync(int pullRequestId);
}

public class GitHubFixerService : IGitHubFixerService
{
    private readonly AppDbContext _dbContext;
    private readonly IAzureOpenAiService _openAiService;
    private readonly ILogger<GitHubFixerService> _logger;
    private readonly string _pat;
    private readonly string _cloneBaseDirectory;

    public GitHubFixerService(
        AppDbContext dbContext,
        IAzureOpenAiService openAiService,
        IConfiguration configuration,
        ILogger<GitHubFixerService> logger)
    {
        _dbContext = dbContext;
        _openAiService = openAiService;
        _logger = logger;

        var githubConfig = configuration.GetSection("GitHub");
        _pat = githubConfig["Pat"] ?? string.Empty;
        
        var cloneDir = githubConfig["CloneDirectory"] ?? "Clones";
        _cloneBaseDirectory = Path.IsPathRooted(cloneDir) 
            ? cloneDir 
            : Path.Combine(Directory.GetCurrentDirectory(), cloneDir);
    }

    public async Task ProcessActionFailureAsync(string repo, string branch, string commitSha, string runId, string errorMessage, string pusherName = "", string pusherEmail = "")
    {
        _logger.LogInformation("Processing GitHub action failure for Repo: {Repo}, Branch: {Branch}, RunId: {RunId}", repo, branch, runId);

        var repoName = repo.Contains('/') ? repo.Split('/')[1] : repo;
        string relativeFilePath = "unknown";
        int lineNumber = 1;

        // ── Step 1: ALWAYS record the failure in the database immediately ──
        var vulnerability = new Vulnerability
        {
            SnykId = $"github-{runId}",
            Title = $"GitHub Actions Build Failure: {repoName}",
            Severity = "critical",
            FilePath = "Pending analysis...",
            LineNumber = 1,
            VulnerableCode = errorMessage.Length > 4000 ? errorMessage[..4000] : errorMessage,
            SecureCode = "",
            Explanation = $"Build failure detected on branch '{branch}' (commit: {commitSha}). Auto-fix analysis in progress...",
            Status = "Open",
            Repo = repo,
            CommitSha = commitSha,
            RunId = runId,
            PusherName = pusherName ?? string.Empty,
            PusherEmail = pusherEmail ?? string.Empty,
            Branch = branch ?? string.Empty,
            Classification = DetermineClassification(errorMessage),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Vulnerabilities.Add(vulnerability);
        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Saved initial build failure record to database (Id: {Id}).", vulnerability.Id);

        // ── Step 2: Attempt automated fix ──
        try
        {
            // 2a. Parse File Path and Line Number from error message
            (relativeFilePath, lineNumber) = await ParseErrorLogsAsync(errorMessage);

            // Update the vulnerability with the parsed file path
            vulnerability.FilePath = string.IsNullOrEmpty(relativeFilePath) || relativeFilePath.Equals("unknown", StringComparison.OrdinalIgnoreCase)
                ? $"Workflow config ({repoName})"
                : relativeFilePath;
            vulnerability.LineNumber = lineNumber;
            await _dbContext.SaveChangesAsync();

            if (string.IsNullOrEmpty(relativeFilePath) || relativeFilePath.Equals("unknown", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Could not identify a specific file path from logs. Saving failure record without auto-fix.");
                vulnerability.Explanation = $"Build failure on branch '{branch}'. Could not identify the failing source file from the error logs. Manual review required.\n\nError:\n{(errorMessage.Length > 2000 ? errorMessage[..2000] : errorMessage)}";
                vulnerability.Status = "Open";
                await _dbContext.SaveChangesAsync();
                return;
            }

            _logger.LogInformation("Parsed target file: {FilePath} at line {Line}", relativeFilePath, lineNumber);

            // 2b. Clone or pull the repository
            var clonePath = Path.Combine(_cloneBaseDirectory, repoName);
            
            if (!Directory.Exists(_cloneBaseDirectory))
            {
                Directory.CreateDirectory(_cloneBaseDirectory);
            }

            if (!Directory.Exists(clonePath))
            {
                _logger.LogInformation("Cloning repository to {Path}", clonePath);
                var cloneUrl = string.IsNullOrEmpty(_pat) 
                    ? $"https://github.com/{repo}.git" 
                    : $"https://{_pat}@github.com/{repo}.git";

                await RunGitCommandAsync($"clone {cloneUrl} \"{clonePath}\"", _cloneBaseDirectory);
            }
            else
            {
                _logger.LogInformation("Repository directory exists. Updating local files.");
                await RunGitCommandAsync("reset --hard", clonePath);
                await RunGitCommandAsync("clean -fd", clonePath);
                await RunGitCommandAsync("fetch origin", clonePath);
            }

            // Checkout target branch
            try
            {
                await RunGitCommandAsync($"checkout {branch}", clonePath);
                await RunGitCommandAsync($"pull origin {branch}", clonePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Checkout or pull failed: {Message}. Attempting to checkout branch directly.", ex.Message);
                await RunGitCommandAsync($"checkout -B {branch} origin/{branch}", clonePath);
            }

            // 2c. Locate the target file and read content
            var fullFilePath = Path.Combine(clonePath, relativeFilePath);
            if (!File.Exists(fullFilePath))
            {
                _logger.LogError("File does not exist: {Path}", fullFilePath);
                vulnerability.Explanation = $"Build failure on branch '{branch}'. Identified file '{relativeFilePath}' but it does not exist in the repository. The error may be in a workflow configuration or a missing file.\n\nError:\n{(errorMessage.Length > 2000 ? errorMessage[..2000] : errorMessage)}";
                await _dbContext.SaveChangesAsync();
                return;
            }

            var originalContent = await File.ReadAllTextAsync(fullFilePath);
            vulnerability.VulnerableCode = originalContent.Length > 4000 ? originalContent[..4000] : originalContent;
            await _dbContext.SaveChangesAsync();

            // 2d. Generate build fix using Azure OpenAI
            var fixResult = await _openAiService.GenerateBuildFixAsync(relativeFilePath, originalContent, errorMessage);
            
            if (string.IsNullOrWhiteSpace(fixResult.SecureCode) || fixResult.SecureCode == originalContent)
            {
                _logger.LogWarning("No changes suggested by OpenAI or fix generation failed.");
                vulnerability.Explanation = $"Build failure on branch '{branch}'. AI analyzed the file '{relativeFilePath}' but could not generate a fix. Manual review required.\n\nError:\n{(errorMessage.Length > 2000 ? errorMessage[..2000] : errorMessage)}";
                await _dbContext.SaveChangesAsync();
                return;
            }

            // 2e. Apply the fix
            await File.WriteAllTextAsync(fullFilePath, fixResult.SecureCode);
            _logger.LogInformation("Applied AI code fix to {Path}", fullFilePath);

            // 2f. Instead of pushing directly to the protected branch, create a new fix branch and push
            var fixBranch = $"codeguardai-fix/{runId}";

            await RunGitCommandAsync("config user.name \"CodeGuardAI\"", clonePath);
            await RunGitCommandAsync("config user.email \"codeguardai@users.noreply.github.com\"", clonePath);

            // Create and switch to new branch based off target branch
            await RunGitCommandAsync($"checkout -b {fixBranch}", clonePath);
            await RunGitCommandAsync($"add \"{relativeFilePath}\"", clonePath);

            var commitMsg = $"Auto-fix: Resolved build/test failure on GitHub Action (Run ID: {runId})";
            await RunGitCommandAsync($"commit -m \"{commitMsg}\"", clonePath);

            _logger.LogInformation("Pushing fix branch {FixBranch} to origin", fixBranch);
            await RunGitCommandAsync($"push origin {fixBranch}", clonePath);
            _logger.LogInformation("Successfully pushed fix branch to GitHub!");

            // Create a PullRequest record so the UI can show the change and provide an Accept button
            var pr = new PullRequest
            {
                Title = commitMsg,
                SourceBranch = fixBranch,
                TargetBranch = branch,
                Status = "Open",
                CreatedAt = DateTime.UtcNow,
                Repo = repo,
                AuthorName = pusherName ?? string.Empty,
                AuthorEmail = pusherEmail ?? string.Empty
            };

            _dbContext.PullRequests.Add(pr);
            await _dbContext.SaveChangesAsync();

            vulnerability.PullRequestId = pr.Id;
            vulnerability.Status = "PRCreated";

            // Save the proposed secure code and explanation so the UI can show the diff
            vulnerability.SecureCode = fixResult.SecureCode.Length > 4000 ? fixResult.SecureCode[..4000] : fixResult.SecureCode;
            vulnerability.Explanation = fixResult.Explanation;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Saved proposed fix and created PR record (PR Id: {PrId}) in database.", pr.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during automated GitHub Actions failure remediation.");
            // Update the vulnerability record with the error details
            vulnerability.Explanation = $"Build failure on branch '{branch}'. Auto-fix attempted but encountered an error: {ex.Message}\n\nOriginal Error:\n{(errorMessage.Length > 1500 ? errorMessage[..1500] : errorMessage)}";
            vulnerability.Status = "Open";
            try { await _dbContext.SaveChangesAsync(); } catch { /* prevent cascading failure */ }
        }
    }

    public async Task MergePullRequestAsync(int pullRequestId)
    {
        var pr = await _dbContext.PullRequests.FindAsync(pullRequestId);
        if (pr == null) throw new InvalidOperationException("Pull request not found.");

        if (string.IsNullOrWhiteSpace(pr.Repo))
            throw new InvalidOperationException("Pull request has no repository set.");

        var repo = pr.Repo;
        var repoName = repo.Contains('/') ? repo.Split('/')[1] : repo;
        var clonePath = Path.Combine(_cloneBaseDirectory, repoName);

        // ── Step 1: Clone or update the repository ──
        if (!Directory.Exists(clonePath))
        {
            if (!Directory.Exists(_cloneBaseDirectory))
            {
                _logger.LogInformation("Creating clone base directory: {Dir}", _cloneBaseDirectory);
                Directory.CreateDirectory(_cloneBaseDirectory);
            }

            _logger.LogInformation("Cloning repository {Repo} to {Path}", repo, clonePath);
            var cloneUrl = string.IsNullOrEmpty(_pat)
                ? $"https://github.com/{repo}.git"
                : $"https://{_pat}@github.com/{repo}.git";
            await RunGitCommandAsync($"clone {cloneUrl} \"{clonePath}\"", _cloneBaseDirectory);
        }
        else
        {
            _logger.LogInformation("Repository already exists at {Path}. Resetting and fetching.", clonePath);
            await RunGitCommandAsync("reset --hard", clonePath);
            await RunGitCommandAsync("clean -fd", clonePath);
            await RunGitCommandAsync("fetch origin", clonePath);
        }

        // Set git identity
        await RunGitCommandAsync("config user.name \"CodeGuardAI\"", clonePath);
        await RunGitCommandAsync("config user.email \"codeguardai@users.noreply.github.com\"", clonePath);

        // ── Step 2: Checkout target branch ──
        await RunGitCommandAsync($"checkout {pr.TargetBranch}", clonePath);
        await RunGitCommandAsync($"pull origin {pr.TargetBranch}", clonePath);

        // ── Step 3: Ensure the fix branch exists on remote ──
        bool sourceBranchExistsOnRemote = false;
        try
        {
            var lsOutput = await RunGitCommandAsync($"ls-remote --heads origin {pr.SourceBranch}", clonePath);
            sourceBranchExistsOnRemote = !string.IsNullOrWhiteSpace(lsOutput);
        }
        catch
        {
            sourceBranchExistsOnRemote = false;
        }

        if (!sourceBranchExistsOnRemote)
        {
            _logger.LogWarning("Fix branch '{Branch}' does not exist on remote. Creating it now with the secure code from the database.", pr.SourceBranch);

            // Get the vulnerability and its secure code
            var vuln = await _dbContext.Vulnerabilities.FirstOrDefaultAsync(v => v.PullRequestId == pr.Id);
            if (vuln == null || string.IsNullOrWhiteSpace(vuln.SecureCode))
            {
                throw new InvalidOperationException($"Cannot create fix branch: no secure code found for PR {pr.Id}.");
            }

            // Create the fix branch from the target branch
            try { await RunGitCommandAsync($"branch -D {pr.SourceBranch}", clonePath); } catch { /* ignore if doesn't exist locally */ }
            await RunGitCommandAsync($"checkout -b {pr.SourceBranch}", clonePath);

            // Determine the file path to apply the fix to
            var filePath = vuln.FilePath;
            if (string.IsNullOrWhiteSpace(filePath) || filePath.StartsWith("Workflow config") || filePath.Equals("unknown", StringComparison.OrdinalIgnoreCase))
            {
                filePath = ".github/workflows/build-and-protect.yml";
            }

            var fullFilePath = Path.Combine(clonePath, filePath.Replace('/', Path.DirectorySeparatorChar));
            var fileDir = Path.GetDirectoryName(fullFilePath);
            if (!string.IsNullOrEmpty(fileDir) && !Directory.Exists(fileDir))
            {
                Directory.CreateDirectory(fileDir);
            }

            // Write the secure code fix
            await File.WriteAllTextAsync(fullFilePath, vuln.SecureCode);
            _logger.LogInformation("Applied secure code fix to {FilePath}", fullFilePath);

            // Commit and push
            await RunGitCommandAsync($"add \"{filePath}\"", clonePath);
            var commitMsg = $"CodeGuardAI auto-fix: {vuln.Title}";
            await RunGitCommandAsync($"commit -m \"{commitMsg}\"", clonePath);
            await RunGitCommandAsync($"push origin {pr.SourceBranch}", clonePath);
            _logger.LogInformation("Successfully pushed fix branch '{Branch}' to remote.", pr.SourceBranch);

            // Switch back to target branch for the merge
            await RunGitCommandAsync($"checkout {pr.TargetBranch}", clonePath);
            await RunGitCommandAsync("fetch origin", clonePath);
        }

        // ── Step 4: Merge the source branch into target ──
        await RunGitCommandAsync($"merge --no-ff origin/{pr.SourceBranch} -m \"Merge PR {pr.Id} - {pr.Title}\"", clonePath);

        // ── Step 5: Push merged target branch ──
        await RunGitCommandAsync($"push origin {pr.TargetBranch}", clonePath);

        // ── Step 6: Update DB state ──
        pr.Status = "Merged";
        pr.MergedAt = DateTime.UtcNow;

        var mergedVuln = await _dbContext.Vulnerabilities.SingleOrDefaultAsync(v => v.PullRequestId == pr.Id);
        if (mergedVuln != null)
        {
            mergedVuln.Status = "Fixed";
        }

        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("PR {PrId} merged successfully. Vulnerability marked as Fixed.", pr.Id);
    }

    private async Task<(string FilePath, int LineNumber)> ParseErrorLogsAsync(string errorMessage)
    {
        // Detect global build/workflow infrastructure failures
        if (errorMessage.Contains("MSB1011", StringComparison.OrdinalIgnoreCase) || 
            errorMessage.Contains("contains more than one project or solution file", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("minimum Node.js version", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("Node.js version", StringComparison.OrdinalIgnoreCase))
        {
            return (".github/workflows/build-and-protect.yml", 1);
        }

        // Try regex patterns to find file path and line number
        // Standard TS/Angular pattern: src/app/app.component.ts:12:3 - error TS2304...
        var tsPattern = new Regex(@"([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+):(\d+):(\d+)");
        var match = tsPattern.Match(errorMessage);
        if (match.Success)
        {
            var filePath = match.Groups[1].Value;
            int.TryParse(match.Groups[2].Value, out var line);
            return (filePath, line);
        }

        // Parentheses pattern: src/app/app.ts(12,3)
        var parenPattern = new Regex(@"([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\((\d+),\d+\)");
        match = parenPattern.Match(errorMessage);
        if (match.Success)
        {
            var filePath = match.Groups[1].Value;
            int.TryParse(match.Groups[2].Value, out var line);
            return (filePath, line);
        }

        // Fallback: Ask Azure OpenAI to extract the failing file path
        try
        {
            _logger.LogInformation("Regex parse failed. Querying Azure OpenAI to identify the file path from logs.");
            var path = await _openAiService.ExtractFilePathFromErrorAsync(errorMessage);
            if (!string.IsNullOrEmpty(path) && !path.Equals("unknown", StringComparison.OrdinalIgnoreCase))
            {
                return (path, 1);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OpenAI log parsing failed.");
        }

        return ("unknown", 1);
    }

    private string DetermineClassification(string errorMessage)
    {
        if (string.IsNullOrWhiteSpace(errorMessage)) return "medium";

        var lower = errorMessage.ToLowerInvariant();

        if (lower.Contains("fatal") || lower.Contains("exception") || lower.Contains("segfault") || lower.Contains("panic") || lower.Contains("failed to load") )
            return "critical";

        if (lower.Contains("error") || lower.Contains("failed") || lower.Contains("undefined reference") || lower.Contains("not found"))
            return "high";

        if (lower.Contains("warning") || lower.Contains("deprecated") || lower.Contains("lint"))
            return "low";

        return "medium";
    }

    private async Task<string> RunGitCommandAsync(string arguments, string workingDirectory)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "git",
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = psi };
        process.Start();

        var outputTask = process.StandardOutput.ReadToEndAsync();
        var errorTask = process.StandardError.ReadToEndAsync();

        await Task.WhenAll(Task.Run(() => process.WaitForExit()), outputTask, errorTask);

        var output = await outputTask;
        var error = await errorTask;

        // Mask PAT token if printed in any error output to prevent credential leaking
        if (!string.IsNullOrEmpty(_pat))
        {
            output = output.Replace(_pat, "******");
            error = error.Replace(_pat, "******");
        }

        if (process.ExitCode != 0)
        {
            throw new Exception($"Git command failed with exit code {process.ExitCode}.\nError: {error.Trim()}\nOutput: {output.Trim()}");
        }

        return output;
    }
}
