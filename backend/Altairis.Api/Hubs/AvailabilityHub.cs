using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Altairis.Api.Hubs;

[Authorize]
public class AvailabilityHub : Hub
{
    public async Task JoinHotel(string hotelId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"hotel:{hotelId}");
    }

    public async Task LeaveHotel(string hotelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"hotel:{hotelId}");
    }
}
