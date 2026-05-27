namespace CodeGuardAI.WebAPI.Models;

public class Leaderboard
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
    public int Score { get; set; }
    public int Rank { get; set; }
}
