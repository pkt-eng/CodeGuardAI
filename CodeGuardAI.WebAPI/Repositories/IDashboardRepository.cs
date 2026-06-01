using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CodeGuardAI.WebAPI.Repositories;

public interface IDashboardRepository
{
    Task<int> GetTotalVulnerabilitiesAsync();
    Task<int> GetFixedOrPRCreatedVulnerabilitiesAsync();
    Task<int> GetHighRiskCountAsync();
    Task<int> GetMediumRiskCountAsync();
    Task<int> GetLowRiskCountAsync();
    
    Task<int> GetDetectedVulnerabilitiesByDateAsync(DateTime date);
    Task<int> GetFixedVulnerabilitiesByDateAsync(DateTime date);
    
    Task<IEnumerable<dynamic>> GetTopVulnerabilitiesAsync(int count);
    
    Task<IEnumerable<dynamic>> GetMergedPullRequestsByMonthAsync(int month, int year);
}
