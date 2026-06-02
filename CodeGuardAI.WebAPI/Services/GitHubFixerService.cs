using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
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
    Task ProcessActionFailureAsync(string repo, string branch, string commitSha, string runId, string errorMessage, string pusherName = "", string pusherEmail = "", string? githubSecretKey = null);
    Task MergePullRequestAsync(int pullRequestId);
}

public class GitHubFixerService : IGitHubFixerService
{
    private readonly AppDbContext _dbContext;
    private readonly IAzureOpenAiService _openAiService;
    private readonly ILogger<GitHubFixerService> _logger;
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
        var cloneDir = githubConfig["CloneDirectory"] ?? "Clones";
        _cloneBaseDirectory = Path.IsPathRooted(cloneDir)
            ? cloneDir
            : Path.Combine(Directory.GetCurrentDirectory(), cloneDir);
    }

    public async Task ProcessActionFailureAsync(string repo, string branch, string commitSha, string runId, string errorMessage, string pusherName = "", string pusherEmail = "", string? githubSecretKey = null)
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
            GithubSecretKey = githubSecretKey,
            Classification = DetermineClassification(errorMessage),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Vulnerabilities.Add(vulnerability);
        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Saved initial build failure record to database (Id: {Id}).", vulnerability.Id);

        // ── Check if there are multiple security findings ──
        var securityFindings = ParseMultipleSecurityFindings(errorMessage);
        if (securityFindings.Count > 1)
        {
            _logger.LogInformation("Detected {Count} security findings. Starting multi-file secure fix flow.", securityFindings.Count);
            
            var vulnerabilities = new List<Vulnerability>();
            var clonePath = Path.Combine(_cloneBaseDirectory, repoName);
            if (!Directory.Exists(_cloneBaseDirectory))
            {
                Directory.CreateDirectory(_cloneBaseDirectory);
            }
            if (!Directory.Exists(clonePath))
            {
                _logger.LogInformation("Cloning repository to {Path}", clonePath);
                var cloneUrl = string.IsNullOrEmpty(githubSecretKey)
                    ? $"https://github.com/{repo}.git"
                    : $"https://{githubSecretKey}@github.com/{repo}.git";
                await RunGitCommandAsync($"clone {cloneUrl} \"{clonePath}\"", _cloneBaseDirectory, githubSecretKey);
            }
            else
            {
                _logger.LogInformation("Repository directory exists. Updating local files.");
                await RunGitCommandAsync("reset --hard", clonePath);
                await RunGitCommandAsync("clean -fd", clonePath);
                await RunGitCommandAsync("fetch origin", clonePath);
            }

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

            bool anyFixApplied = false;
            for (int i = 0; i < securityFindings.Count; i++)
            {
                var finding = securityFindings[i];
                var fullFilePath = Path.Combine(clonePath, finding.FilePath);
                if (!File.Exists(fullFilePath)) continue;

                var originalContent = await File.ReadAllTextAsync(fullFilePath);
                
                _logger.LogInformation("Generating Secure Fix via Azure OpenAI for file: {FilePath}", finding.FilePath);
                var fixResult = await _openAiService.GenerateSecureFixAsync($"GitHub Actions Build Failure: {repoName} - {finding.FindingType}", finding.FilePath, originalContent);

                if (string.IsNullOrWhiteSpace(fixResult.SecureCode) || fixResult.SecureCode == originalContent)
                {
                    _logger.LogWarning("No changes generated for {FilePath}", finding.FilePath);
                    continue;
                }

                await File.WriteAllTextAsync(fullFilePath, fixResult.SecureCode);
                anyFixApplied = true;

                Vulnerability vuln;
                if (i == 0)
                {
                    vuln = vulnerability;
                    vuln.FilePath = finding.FilePath;
                    vuln.LineNumber = finding.LineNumber;
                    vuln.Title = $"Secure Fix: {finding.FindingType}";
                    vuln.VulnerableCode = originalContent.Length > 4000 ? originalContent[..4000] : originalContent;
                    vuln.SecureCode = fixResult.SecureCode.Length > 4000 ? fixResult.SecureCode[..4000] : fixResult.SecureCode;
                    vuln.Explanation = fixResult.Explanation;
                }
                else
                {
                    vuln = new Vulnerability
                    {
                        SnykId = $"github-{runId}-{i}",
                        Title = $"Secure Fix: {finding.FindingType}",
                        Severity = "critical",
                        FilePath = finding.FilePath,
                        LineNumber = finding.LineNumber,
                        VulnerableCode = originalContent.Length > 4000 ? originalContent[..4000] : originalContent,
                        SecureCode = fixResult.SecureCode.Length > 4000 ? fixResult.SecureCode[..4000] : fixResult.SecureCode,
                        Explanation = fixResult.Explanation,
                        Status = "Open",
                        Repo = repo,
                        CommitSha = commitSha,
                        RunId = runId,
                        PusherName = pusherName ?? string.Empty,
                        PusherEmail = pusherEmail ?? string.Empty,
                        Branch = branch ?? string.Empty,
                        GithubSecretKey = githubSecretKey,
                        Classification = "high",
                        CreatedAt = DateTime.UtcNow
                    };
                    _dbContext.Vulnerabilities.Add(vuln);
                }
                vulnerabilities.Add(vuln);
            }

            if (!anyFixApplied)
            {
                _logger.LogWarning("No code fixes could be applied for any of the findings.");
                vulnerability.Explanation = $"Build failure on branch '{branch}'. AI failed to generate code fixes for any of the {securityFindings.Count} detected files.";
                vulnerability.Status = "Open";
                await _dbContext.SaveChangesAsync();
                return;
            }

            var fixBranch = $"codeguardai-fix/{runId}";
            await RunGitCommandAsync("config user.name \"CodeGuardAI\"", clonePath);
            await RunGitCommandAsync("config user.email \"codeguardai@users.noreply.github.com\"", clonePath);
            await RunGitCommandAsync($"checkout -b {fixBranch}", clonePath);

            foreach (var vuln in vulnerabilities)
            {
                await RunGitCommandAsync($"add \"{vuln.FilePath}\"", clonePath);
            }

            var commitMsg = $"Auto-fix: Resolved {vulnerabilities.Count} security findings on GitHub Action (Run ID: {runId})";
            await RunGitCommandAsync($"commit -m \"{commitMsg}\"", clonePath);

            _logger.LogInformation("Skipping auto-push of multi-fix branch {FixBranch} to origin. Changes remain local.", fixBranch);

            var pr = new PullRequest
            {
                Title = commitMsg,
                SourceBranch = fixBranch,
                TargetBranch = branch ?? string.Empty,
                Status = "Open",
                CreatedAt = DateTime.UtcNow,
                Repo = repo,
                AuthorName = pusherName ?? string.Empty,
                AuthorEmail = pusherEmail ?? string.Empty
            };
            _dbContext.PullRequests.Add(pr);
            await _dbContext.SaveChangesAsync();

            foreach (var vuln in vulnerabilities)
            {
                vuln.PullRequestId = pr.Id;
                vuln.Status = "PRCreated";
            }
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Saved proposed multi-fix and created single PR record (PR Id: {PrId}) in database linking {Count} vulnerabilities.", pr.Id, vulnerabilities.Count);
            return;
        }

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
                var cloneUrl = string.IsNullOrEmpty(vulnerability.GithubSecretKey)
                    ? $"https://github.com/{repo}.git"
                    : $"https://{vulnerability.GithubSecretKey}@github.com/{repo}.git";

                await RunGitCommandAsync($"clone {cloneUrl} \"{clonePath}\"", _cloneBaseDirectory, vulnerability.GithubSecretKey);
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
                if (relativeFilePath.StartsWith("workflow:", StringComparison.OrdinalIgnoreCase))
                {
                    var workflowName = relativeFilePath.Substring("workflow:".Length);
                    relativeFilePath = await ResolveWorkflowFilePathAsync(clonePath, workflowName.Trim());
                    fullFilePath = Path.Combine(clonePath, relativeFilePath);
                }
            }

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

            // 2d. Choose the remediation mode based on the failure type
            var isSecurityIssue = IsSecurityFindingError(errorMessage) || relativeFilePath.EndsWith(".html", StringComparison.OrdinalIgnoreCase) ||
                relativeFilePath.EndsWith(".ts", StringComparison.OrdinalIgnoreCase);

            RemediationResult fixResult;
            if (isSecurityIssue)
            {
                _logger.LogInformation("Detected security issue in logs. Using secure fix flow for {FilePath}", relativeFilePath);
                fixResult = await _openAiService.GenerateSecureFixAsync(vulnerability.Title, relativeFilePath, originalContent);
            }
            else
            {
                fixResult = await _openAiService.GenerateBuildFixAsync(relativeFilePath, originalContent, errorMessage);
            }

            if (string.IsNullOrWhiteSpace(fixResult.SecureCode) || fixResult.SecureCode == originalContent)
            {
                _logger.LogWarning("No changes suggested by OpenAI or fix generation failed.");
                vulnerability.Explanation = $"Build failure on branch '{branch}'. AI analyzed the file '{relativeFilePath}' but could not generate a fix. Manual review required.\n\nError:\n{(errorMessage.Length > 2000 ? errorMessage[..2000] : errorMessage)}";
                await _dbContext.SaveChangesAsync();
                return;
            }

            if ((relativeFilePath.EndsWith("package.json", StringComparison.OrdinalIgnoreCase) ||
                 relativeFilePath.EndsWith("package-lock.json", StringComparison.OrdinalIgnoreCase)) &&
                !IsValidJson(fixResult.SecureCode))
            {
                _logger.LogWarning("AI generated invalid JSON for {FilePath}. Aborting fix.", relativeFilePath);
                vulnerability.Explanation = $"Build failure on branch '{branch}'. AI attempted a package manifest fix for '{relativeFilePath}', but the generated content was not valid JSON. Manual review is required.\n\nOriginal Error:\n{(errorMessage.Length > 2000 ? errorMessage[..2000] : errorMessage)}";
                vulnerability.Status = "Open";
                await _dbContext.SaveChangesAsync();
                return;
            }

            // 2e. Apply the fix
            await File.WriteAllTextAsync(fullFilePath, fixResult.SecureCode);
            _logger.LogInformation("Applied AI code fix to {Path}", fullFilePath);

            // 2f. Instead of pushing directly to the protected branch, create a new fix branch and verify the build first
            var fixBranch = $"codeguardai-fix/{runId}";

            await RunGitCommandAsync("config user.name \"CodeGuardAI\"", clonePath);
            await RunGitCommandAsync("config user.email \"codeguardai@users.noreply.github.com\"", clonePath);

            // Create and switch to new branch based off target branch
            await RunGitCommandAsync($"checkout -b {fixBranch}", clonePath);
            await RunGitCommandAsync($"add \"{relativeFilePath}\"", clonePath);

            var commitMsg = $"Auto-fix: Resolved build/test failure on GitHub Action (Run ID: {runId})";

            var buildStatus = await VerifyBuildAsync(clonePath, relativeFilePath);
            if (!buildStatus.IsSuccess)
            {
                _logger.LogWarning("Build verification failed after applying fix: {Reason}", buildStatus.Reason);
                vulnerability.Explanation = $"Build verification failed after AI fix: {buildStatus.Reason}\n\nOriginal fix explanation:\n{fixResult.Explanation}";
                vulnerability.Status = "Open";
                await _dbContext.SaveChangesAsync();
                return;
            }

            await RunGitCommandAsync($"commit -m \"{commitMsg}\"", clonePath);

            _logger.LogInformation("Skipping auto-push of fix branch {FixBranch} to origin. Changes remain local.", fixBranch);

            // Create a PullRequest record so the UI can show the change and provide an Accept button
            var pr = new PullRequest
            {
                Title = commitMsg,
                SourceBranch = fixBranch,
                TargetBranch = branch ?? string.Empty,
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

        // Get all associated vulnerabilities
        var vulnerabilities = await _dbContext.Vulnerabilities.Where(v => v.PullRequestId == pr.Id).ToListAsync();
        if (!vulnerabilities.Any())
            throw new InvalidOperationException($"No associated vulnerabilities found for Pull Request {pullRequestId}.");

        var associatedVuln = vulnerabilities.First();

        if (string.IsNullOrWhiteSpace(pr.Repo))
        {
            if (!string.IsNullOrWhiteSpace(associatedVuln.Repo))
            {
                pr.Repo = associatedVuln.Repo;
            }
            else
            {
                pr.Repo = "AshokaGS/EarnEasyWorkmates";
            }
            await _dbContext.SaveChangesAsync();
        }

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
            var cloneUrl = string.IsNullOrEmpty(associatedVuln.GithubSecretKey)
                ? $"https://github.com/{repo}.git"
                : $"https://{associatedVuln.GithubSecretKey}@github.com/{repo}.git";
            await RunGitCommandAsync($"clone {cloneUrl} \"{clonePath}\"", _cloneBaseDirectory, associatedVuln.GithubSecretKey);
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

        // ── Step 3: Apply all secure code fixes directly ──
        foreach (var vuln in vulnerabilities)
        {
            if (string.IsNullOrWhiteSpace(vuln.SecureCode))
            {
                _logger.LogWarning("Vulnerability {Id} has no secure code to apply.", vuln.Id);
                continue;
            }

            var filePath = vuln.FilePath;
            if (filePath.StartsWith("workflow:", StringComparison.OrdinalIgnoreCase))
            {
                filePath = await ResolveWorkflowFilePathAsync(clonePath, filePath.Substring("workflow:".Length).Trim());
            }
            else if (string.IsNullOrWhiteSpace(filePath) || filePath.StartsWith("Workflow config") || filePath.Equals("unknown", StringComparison.OrdinalIgnoreCase))
            {
                filePath = await ResolveWorkflowFilePathAsync(clonePath, "CodeGuardAI Build & Protect");
            }

            var fullFilePath = Path.Combine(clonePath, filePath.Replace('/', Path.DirectorySeparatorChar));
            var fileDir = Path.GetDirectoryName(fullFilePath);
            if (!string.IsNullOrEmpty(fileDir) && !Directory.Exists(fileDir))
            {
                Directory.CreateDirectory(fileDir);
            }

            await File.WriteAllTextAsync(fullFilePath, vuln.SecureCode);
            _logger.LogInformation("Applied secure code fix to {FilePath}", fullFilePath);

            await RunGitCommandAsync($"add \"{filePath}\"", clonePath);
        }

        // ── Step 4: Commit and Push to target branch ──
        try
        {
            var commitMsg = $"Merge PR {pr.Id} - {pr.Title}";
            await RunGitCommandAsync($"commit -m \"{commitMsg}\"", clonePath);
            
            _logger.LogInformation("Pushing merged target branch {TargetBranch} directly to origin", pr.TargetBranch);
            await RunGitCommandAsync($"push origin {pr.TargetBranch}", clonePath, associatedVuln.GithubSecretKey);
            _logger.LogInformation("Successfully pushed merged target branch to GitHub!");
        }
        catch (Exception ex)
        {
            if (ex.Message.Contains("nothing to commit") || ex.Message.Contains("working tree clean"))
            {
                _logger.LogInformation("No changes to commit for {Branch} - working tree is clean.", pr.TargetBranch);
            }
            else
            {
                throw;
            }
        }

        // ── Step 5: Update DB state ──
        pr.Status = "Merged";
        pr.MergedAt = DateTime.UtcNow;

        foreach (var vuln in vulnerabilities)
        {
            vuln.Status = "Fixed";
        }

        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("PR {PrId} merged successfully. All {Count} associated vulnerabilities marked as Fixed.", pr.Id, vulnerabilities.Count);
    }

    private async Task<(string FilePath, int LineNumber)> ParseErrorLogsAsync(string errorMessage)
    {
        // Detect named workflow failures and map them to a workflow token for later resolution
        if (errorMessage.Contains("CodeGuardAI Build & Protect", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("Build & Protect", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("CodeGuardAI Build and Protect", StringComparison.OrdinalIgnoreCase))
        {
            return ("workflow:CodeGuardAI Build & Protect", 1);
        }

        // Detect global build/workflow infrastructure failures
        if (errorMessage.Contains("MSB1011", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("contains more than one project or solution file", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("minimum Node.js version", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("Node.js version", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("No build or security logs captured.", StringComparison.OrdinalIgnoreCase))
        {
            return ("workflow:CodeGuardAI Build & Protect", 1);
        }

        // Detect security scan finding lines and prioritize the affected source file.
        var securityFindingPattern = new Regex(@"(\./?[\w\-\.\/]+\.(html|ts|js|jsx|tsx|cs)):?(\d+)?", RegexOptions.IgnoreCase);
        if (errorMessage.Contains("SECURITY_FINDING", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("security finding", StringComparison.OrdinalIgnoreCase))
        {
            var securityMatch = securityFindingPattern.Match(errorMessage);
            if (securityMatch.Success)
            {
                var filePath = securityMatch.Groups[1].Value.Replace("./", string.Empty);
                int.TryParse(securityMatch.Groups[3].Value, out var line);
                return (filePath, line == 0 ? 1 : line);
            }
        }

        // Detect npm dependency resolution errors and map them to package.json
        if (errorMessage.Contains("npm ERR! code ETARGET", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("No matching version found for", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("Could not resolve dependency", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("ERESOLVE unable to resolve dependency tree", StringComparison.OrdinalIgnoreCase) ||
            errorMessage.Contains("No matching version found for moment", StringComparison.OrdinalIgnoreCase))
        {
            return ("package.json", 1);
        }

        // Try regex patterns to find file path and line number
        // Standard TS/Angular pattern: src/app/app.component.ts:12:3 - error TS2304...
        var tsPattern = new Regex(@"([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+):(\d+):(\d+)");
        var tsMatch = tsPattern.Match(errorMessage);
        if (tsMatch.Success)
        {
            var filePath = tsMatch.Groups[1].Value;
            int.TryParse(tsMatch.Groups[2].Value, out var line);
            return (filePath, line);
        }

        // Parentheses pattern: src/app/app.ts(12,3)
        var parenPattern = new Regex(@"([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\((\d+),\d+\)");
        var parenMatch = parenPattern.Match(errorMessage);
        if (parenMatch.Success)
        {
            var filePath = parenMatch.Groups[1].Value;
            int.TryParse(parenMatch.Groups[2].Value, out var line);
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

        if (lower.Contains("fatal") || lower.Contains("exception") || lower.Contains("segfault") || lower.Contains("panic") || lower.Contains("failed to load"))
            return "critical";

        if (lower.Contains("error") || lower.Contains("failed") || lower.Contains("undefined reference") || lower.Contains("not found"))
            return "high";

        if (lower.Contains("warning") || lower.Contains("deprecated") || lower.Contains("lint"))
            return "low";

        return "medium";
    }

    private bool IsSecurityFindingError(string errorMessage)
    {
        return !string.IsNullOrWhiteSpace(errorMessage) && errorMessage.Contains("SECURITY_FINDING", StringComparison.OrdinalIgnoreCase);
    }

    private bool IsValidJson(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<string> ResolveWorkflowFilePathAsync(string repoPath, string workflowName)
    {
        var workflowDirectory = Path.Combine(repoPath, ".github", "workflows");
        if (!Directory.Exists(workflowDirectory))
        {
            return ".github/workflows/build-and-protect.yml";
        }

        var candidates = Directory.EnumerateFiles(workflowDirectory, "*.yml", SearchOption.TopDirectoryOnly)
            .Concat(Directory.EnumerateFiles(workflowDirectory, "*.yaml", SearchOption.TopDirectoryOnly))
            .ToList();

        if (!candidates.Any())
        {
            return ".github/workflows/build-and-protect.yml";
        }

        if (!string.IsNullOrWhiteSpace(workflowName))
        {
            var normalizedWorkflowName = workflowName.Trim().ToLowerInvariant();
            foreach (var candidate in candidates)
            {
                try
                {
                    var content = await File.ReadAllTextAsync(candidate);
                    if (content.Contains($"name: {workflowName}", StringComparison.OrdinalIgnoreCase) ||
                        content.Contains(normalizedWorkflowName, StringComparison.OrdinalIgnoreCase) ||
                        content.Contains("build & protect", StringComparison.OrdinalIgnoreCase))
                    {
                        return Path.GetRelativePath(repoPath, candidate).Replace(Path.DirectorySeparatorChar, '/');
                    }
                }
                catch
                {
                    // ignore invalid YAML files
                }
            }
        }

        // Prefer a file that contains build/protect markers, otherwise return the first workflow file.
        var preferred = candidates.FirstOrDefault(path =>
            path.Contains("build", StringComparison.OrdinalIgnoreCase) &&
            path.Contains("protect", StringComparison.OrdinalIgnoreCase));
        if (preferred != null)
        {
            return Path.GetRelativePath(repoPath, preferred).Replace(Path.DirectorySeparatorChar, '/');
        }

        return Path.GetRelativePath(repoPath, candidates.First()).Replace(Path.DirectorySeparatorChar, '/');
    }

    private record BuildVerificationResult(bool IsSuccess, string Reason);

    private async Task<BuildVerificationResult> VerifyBuildAsync(string repoPath, string relativeFilePath)
    {
        try
        {
            if (File.Exists(Path.Combine(repoPath, "package.json")))
            {
                _logger.LogInformation("Detected npm project at {RepoPath}. Running npm install and validation.", repoPath);
                await RunShellCommandAsync("npm install", repoPath);

                var validationCommand = await GetNpmValidationCommandAsync(repoPath);
                if (!string.IsNullOrWhiteSpace(validationCommand))
                {
                    await RunShellCommandAsync(validationCommand, repoPath);
                }

                return new BuildVerificationResult(true, "npm install and validation succeeded");
            }

            if (Directory.EnumerateFiles(repoPath, "*.sln", SearchOption.AllDirectories).Any() ||
                Directory.EnumerateFiles(repoPath, "*.csproj", SearchOption.AllDirectories).Any())
            {
                _logger.LogInformation("Detected .NET project at {RepoPath}. Running dotnet build.", repoPath);
                await RunShellCommandAsync("dotnet build --configuration Release", repoPath);
                return new BuildVerificationResult(true, ".NET build succeeded");
            }

            _logger.LogInformation("No explicit build verification rules found for repo {RepoPath}. Skipping build validation.", repoPath);
            return new BuildVerificationResult(true, "No build verification executed");
        }
        catch (Exception ex)
        {
            return new BuildVerificationResult(false, ex.Message);
        }
    }

    private async Task<string?> GetNpmValidationCommandAsync(string repoPath)
    {
        var packageJsonPath = Path.Combine(repoPath, "package.json");
        if (!File.Exists(packageJsonPath)) return null;

        var jsonText = await File.ReadAllTextAsync(packageJsonPath);
        try
        {
            using var document = JsonDocument.Parse(jsonText);
            if (document.RootElement.TryGetProperty("scripts", out var scripts))
            {
                if (scripts.TryGetProperty("build", out _)) return "npm run build";
                if (scripts.TryGetProperty("test", out _)) return "npm test";
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Unable to parse package.json for validation command.");
        }

        return null;
    }

    private async Task RunShellCommandAsync(string command, string workingDirectory)
    {
        var psi = new ProcessStartInfo
        {
            FileName = OperatingSystem.IsWindows() ? "cmd.exe" : "/bin/bash",
            Arguments = OperatingSystem.IsWindows() ? $"/c {command}" : $"-lc \"{command}\"",
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

        if (process.ExitCode != 0)
        {
            throw new Exception($"Shell command '{command}' failed with exit code {process.ExitCode}. Error: {error.Trim()} Output: {output.Trim()}");
        }
    }

    private async Task<string> RunGitCommandAsync(string arguments, string workingDirectory, string? secretToMask = null)
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

        // Mask GitHub secret if provided to prevent credential leaking in logs
        if (!string.IsNullOrEmpty(secretToMask))
        {
            output = output.Replace(secretToMask, "******");
            error = error.Replace(secretToMask, "******");
        }

        if (process.ExitCode != 0)
        {
            throw new Exception($"Git command failed with exit code {process.ExitCode}.\nError: {error.Trim()}\nOutput: {output.Trim()}");
        }

        return output;
    }

    private List<(string FilePath, int LineNumber, string FindingType)> ParseMultipleSecurityFindings(string errorMessage)
    {
        var findings = new List<(string FilePath, int LineNumber, string FindingType)>();
        var securityFindingPattern = new Regex(@"(\./?[\w\-\.\/]+\.(html|ts|js|jsx|tsx|cs)):?(\d+)?", RegexOptions.IgnoreCase);
        
        var lines = errorMessage.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        foreach (var line in lines)
        {
            if (line.Contains("SECURITY_FINDING", StringComparison.OrdinalIgnoreCase))
            {
                var match = securityFindingPattern.Match(line);
                if (match.Success)
                {
                    var filePath = match.Groups[1].Value.Replace("./", string.Empty);
                    int.TryParse(match.Groups[3].Value, out var lineNum);
                    var findingText = line.Substring(line.IndexOf("SECURITY_FINDING", StringComparison.OrdinalIgnoreCase));
                    findings.Add((filePath, lineNum == 0 ? 1 : lineNum, findingText));
                }
            }
        }
        
        return findings.GroupBy(f => f.FilePath).Select(g => g.First()).ToList();
    }
}
