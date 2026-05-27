using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CodeGuardAI.WebAPI.Data;

namespace CodeGuardAI.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

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

        // Calculate a dynamic risk score from 0 to 100 (where 100 is perfectly secure, i.e. no vulnerabilities)
        // Deduct points for open vulnerabilities:
        // Critical: 25 pts, High: 15 pts, Medium: 5 pts, Low: 1 pt
        var totalDeductions = (criticalCount * 25) + (highCount * 15) + (mediumCount * 5) + lowCount;
        var riskScore = Math.Max(0, 100 - totalDeductions);

        // Retrieve leaderboard ranked
        var leaderboard = await _context.Leaderboards.OrderBy(l => l.Rank).ToListAsync();

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
}
