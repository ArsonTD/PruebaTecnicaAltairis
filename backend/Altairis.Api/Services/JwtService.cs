using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Altairis.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace Altairis.Api.Services;

public class JwtOptions
{
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "altairis";
    public string Audience { get; set; } = "altairis-clients";
    public int ExpiresHours { get; set; } = 8;
}

public class JwtService
{
    private readonly JwtOptions _options;

    public JwtService(IConfiguration config)
    {
        _options = new JwtOptions
        {
            Key = config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing"),
            Issuer = config["Jwt:Issuer"] ?? "altairis",
            Audience = config["Jwt:Audience"] ?? "altairis-clients",
            ExpiresHours = int.TryParse(config["Jwt:ExpiresHours"], out var h) ? h : 8
        };
    }

    public JwtOptions Options => _options;

    public (string Token, DateTime ExpiresAt) CreateToken(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id),
            new("fullName", user.FullName ?? string.Empty)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddHours(_options.ExpiresHours);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
