using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CodeGuardAI.WebAPI.Data;
using CodeGuardAI.WebAPI.Models;

namespace CodeGuardAI.WebAPI.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _context;

    public DashboardRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<int> GetTotalVulnerabilitiesAsync()
    {
        return await _context.Vulnerabilities.CountAsync();
    }

    public async Task<int> GetFixedOrPRCreatedVulnerabilitiesAsync()
    {
        return await _context.Vulnerabilities
            .CountAsync(v => v.Status == "Fixed" || v.Status == "PRCreated");
    }

    public async Task<int> GetHighRiskCountAsync()
    {
        return await _context.Vulnerabilities
            .CountAsync(v => (v.Severity == "critical" || v.Severity == "high") && v.Status != "Fixed");
    }

    public async Task<int> GetMediumRiskCountAsync()
    {
        return await _context.Vulnerabilities
            .CountAsync(v => v.Severity == "medium" && v.Status != "Fixed");
    }

    public async Task<int> GetLowRiskCountAsync()
    {
        return await _context.Vulnerabilities
            .CountAsync(v => v.Severity == "low" && v.Status != "Fixed");
    }

    public async Task<int> GetDetectedVulnerabilitiesByDateAsync(DateTime date)
    {
        return await _context.Vulnerabilities
            .CountAsync(v => v.CreatedAt.Date == date);
    }

    public async Task<int> GetFixedVulnerabilitiesByDateAsync(DateTime date)
    {
        return await _context.Vulnerabilities
            .CountAsync(v => v.CreatedAt.Date == date && (v.Status == "Fixed" || v.Status == "PRCreated"));
    }

    public async Task<IEnumerable<dynamic>> GetTopVulnerabilitiesAsync(int count)
    {
        var topVulnerabilities = await _context.Vulnerabilities
            .GroupBy(v => v.Title)
            .Select(g => new { Name = g.Key, Occurrences = g.Count() })
            .OrderByDescending(x => x.Occurrences)
            .Take(count)
            .ToListAsync();
            
        return topVulnerabilities;
    }

    public async Task<IEnumerable<dynamic>> GetMergedPullRequestsByMonthAsync(int month, int year)
    {
        var prs = await _context.PullRequests
            .Where(p => p.CreatedAt.Month == month && p.CreatedAt.Year == year && p.Status == "Merged" && p.MergedAt.HasValue)
            .Select(p => new { p.CreatedAt, p.MergedAt })
            .ToListAsync();
            
        return prs;
    }
}
