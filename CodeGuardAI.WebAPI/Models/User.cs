using System.ComponentModel.DataAnnotations;

namespace CodeGuardAI.WebAPI.Models;

public class User
{
    public int Id { get; set; }
    [Required]
    public string Username { get; set; } = string.Empty;
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Developer";
}
