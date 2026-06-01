using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using CodeGuardAI.WebAPI.Services;

namespace CodeGuardAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GitHubController : ControllerBase
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GitHubController> _logger;

    public GitHubController(IServiceScopeFactory scopeFactory, ILogger<GitHubController> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost("action-failure")]
    public IActionResult ActionFailure([FromBody] ActionFailureRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Repo) || string.IsNullOrWhiteSpace(request.Branch))
        {
            return BadRequest(new { Message = "Repo and Branch are required." });
        }

        _logger.LogInformation("Received build failure notification for {Repo} ({Branch}). Commencing background auto-fix.", request.Repo, request.Branch);

        // Process in background asynchronously so the GitHub runner/caller receives immediate acknowledgement and we avoid timeouts
        _ = Task.Run(async () =>
        {
            using var scope = _scopeFactory.CreateScope();
            try
            {
                var githubFixerService = scope.ServiceProvider.GetRequiredService<IGitHubFixerService>();
                await githubFixerService.ProcessActionFailureAsync(
                    request.Repo,
                    request.Branch,
                    request.CommitSha,
                    request.RunId,
                    request.ErrorMessage,
                    request.PusherName,
                    request.PusherEmail,
                    request.GithubSecretKey
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background error fixing action failure for {Repo}", request.Repo);
            }
        });

        return Accepted(new { Message = "GitHub action failure received. Auto-fixer background process started." });
    }
}

public class ActionFailureRequest
{
    public string Repo { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string CommitSha { get; set; } = string.Empty;
    public string RunId { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    // Optional metadata passed from the GitHub webhook or Action
    public string PusherName { get; set; } = string.Empty;
    public string PusherEmail { get; set; } = string.Empty;

    public string? GithubSecretKey { get; set; }
}
