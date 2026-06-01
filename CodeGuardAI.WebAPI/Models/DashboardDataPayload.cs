using System.Collections.Generic;

namespace CodeGuardAI.WebAPI.Models;

public class DashboardDataPayload
{
    public IEnumerable<object> RiskOverview { get; set; } = new List<object>();
    public IEnumerable<object> VulnerabilityTrends { get; set; } = new List<object>();
    public IEnumerable<object> TopVulnerabilities { get; set; } = new List<object>();
    public int FixAdoptionRate { get; set; }
    public IEnumerable<object> MttrAndSavings { get; set; } = new List<object>();
}
