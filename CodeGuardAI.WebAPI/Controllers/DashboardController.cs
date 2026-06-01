using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CodeGuardAI.WebAPI.Services;
using CodeGuardAI.WebAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace CodeGuardAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IDashboardService _dashboardService;

    public DashboardController(AppDbContext context, IDashboardService dashboardService)
    {
        _context = context;
        _dashboardService = dashboardService;
    }

    [AllowAnonymous]
    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics()
    {
        var vulnerabilities = await _context.Vulnerabilities.ToListAsync();

        var criticalCount = vulnerabilities.Count(v => v.Severity == "critical" && v.Status != "Fixed");
        var highCount = vulnerabilities.Count(v => v.Severity == "high" && v.Status != "Fixed");
        var mediumCount = vulnerabilities.Count(v => v.Severity == "medium" && v.Status != "Fixed");
        var lowCount = vulnerabilities.Count(v => v.Severity == "low" && v.Status != "Fixed");
        var fixedCount = vulnerabilities.Count(v => v.Status == "Fixed");
        var totalCount = vulnerabilities.Count;

        var totalDeductions = (criticalCount * 25) + (highCount * 15) + (mediumCount * 5) + lowCount;
        var riskScore = System.Math.Max(0, 100 - totalDeductions);

        var leaderboard = await _context.Leaderboards.OrderByDescending(l => l.Score).ToListAsync();
        for (int i = 0; i < leaderboard.Count; i++)
        {
            leaderboard[i].Rank = i + 1;
        }

        return Ok(new
        {
            RiskScore = riskScore,
            CriticalCount = criticalCount,
            HighCount = highCount,
            MediumCount = mediumCount,
            LowCount = lowCount,
            FixedCount = fixedCount,
            TotalCount = totalCount,
            Leaderboard = leaderboard
        });
    }

    [AllowAnonymous]
    [HttpGet("data")]
    public async Task<IActionResult> GetDashboardData()
    {
        var data = await _dashboardService.GetDashboardDataAsync();
        return Ok(data);
    }
}
