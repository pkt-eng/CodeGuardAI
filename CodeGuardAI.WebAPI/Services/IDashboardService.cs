using System;
using System.Threading.Tasks;
using CodeGuardAI.WebAPI.Models;

namespace CodeGuardAI.WebAPI.Services;

public interface IDashboardService
{
    Task<DashboardDataPayload> GetDashboardDataAsync();
}
