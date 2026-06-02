using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CodeGuardAI.WebAPI.Data;
using CodeGuardAI.WebAPI.Models;
using CodeGuardAI.WebAPI.Services;

namespace CodeGuardAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PullRequestController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IGitHubFixerService _gitHubFixerService;

    public PullRequestController(AppDbContext context, IGitHubFixerService gitHubFixerService)
    {
        _context = context;
        _gitHubFixerService = gitHubFixerService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPullRequests()
    {
        var prs = await _context.PullRequests.OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(prs);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPullRequestDetails(int id)
    {
        var pr = await _context.PullRequests.FindAsync(id);
        if (pr == null)
        {
            return NotFound(new { Message = "Pull Request not found." });
        }

        // Fetch associated vulnerabilities to show before/after diffs
        var vulnerabilities = await _context.Vulnerabilities.Where(v => v.PullRequestId == id).ToListAsync();

        return Ok(new
        {
            PullRequest = pr,
            Vulnerabilities = vulnerabilities
        });
    }

    [HttpPost("{id}/merge")]
    public async Task<IActionResult> MergePullRequest(int id)
    {
        var pr = await _context.PullRequests.FindAsync(id);
        if (pr == null)
        {
            return NotFound(new { Message = "Pull Request not found." });
        }
        if (pr.Status == "Merged")
        {
            return BadRequest(new { Message = "Pull Request is already merged." });
        }

        try
        {
            // Perform the merge and push to the repository
            await _gitHubFixerService.MergePullRequestAsync(id);

            var vulnerabilities = await _context.Vulnerabilities.Where(v => v.PullRequestId == id).ToListAsync();
            var vulnerability = vulnerabilities.FirstOrDefault();

            // Reward points for merged PR
            var developerName = !string.IsNullOrWhiteSpace(pr.AuthorName)
                ? pr.AuthorName
                : (!string.IsNullOrWhiteSpace(vulnerability?.PusherName) ? vulnerability.PusherName : "John Doe");

            var developer = await _context.Leaderboards.FirstOrDefaultAsync(l => l.Name.ToLower() == developerName.ToLower());
            if (developer == null)
            {
                developer = new Leaderboard
                {
                    Name = developerName,
                    Avatar = $"https://api.dicebear.com/7.x/bottts/svg?seed={Uri.EscapeDataString(developerName)}",
                    Score = 0,
                    Rank = (await _context.Leaderboards.CountAsync()) + 1
                };
                _context.Leaderboards.Add(developer);
                await _context.SaveChangesAsync();
            }

            developer.Score += 100;
            await _context.SaveChangesAsync();

            // Recalculate ranks based on descending score
            var leaderboard = await _context.Leaderboards.OrderByDescending(l => l.Score).ToListAsync();
            for (int i = 0; i < leaderboard.Count; i++)
            {
                leaderboard[i].Rank = i + 1;
            }
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Pull Request successfully merged! Vulnerability remediated and secure code applied.",
                PullRequest = pr,
                Vulnerabilities = vulnerabilities
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Message = "Merge failed.", Details = ex.Message });
        }
    }
}
