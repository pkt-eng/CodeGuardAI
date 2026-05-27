using System;

namespace CodeGuardAI.WebAPI.Models;

public class PullRequest
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string SourceBranch { get; set; } = string.Empty;
    public string TargetBranch { get; set; } = "main";
    public string Status { get; set; } = "Open"; // Open, Merged, Closed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? MergedAt { get; set; }
    // Metadata about the PR
    public string Repo { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorEmail { get; set; } = string.Empty;
    public string CommitSha { get; set; } = string.Empty;
}
