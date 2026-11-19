// xpburst.js - /xpburst [player] [count]
//
// Dumps a large shower of experience orbs around a player, right now.
// Uses the Bukkit entity API directly so a few thousand orbs appear in one
// tick instead of dispatching thousands of /summon commands.

var XB_Bukkit = importClass("org.bukkit.Bukkit");
var XB_EntityType = importClass("org.bukkit.entity.EntityType");
var XB_Vector = importClass("org.bukkit.util.Vector");

var XB_DEFAULT = 2000;
var XB_MAX = 5000;

function xbLog(what, e) {
    try { XB_Bukkit.getConsoleSender().sendMessage("[xpburst.js] " + what + ": " + e); } catch (x) {}
}

function xbIsPlayer(sender) {
    try { sender.getLocation(); return true; } catch (e) { return false; }
}

function xbBurst(player, count) {
    var world = player.getWorld();
    var base = player.getLocation();
    var spawned = 0;
    var firstError = null;
    for (var i = 0; i < count; i++) {
        var ang = Math.random() * Math.PI * 2;
        var rad = Math.random() * 5.0;
        var loc = base.clone().add(Math.cos(ang) * rad, 0.6 + Math.random() * 2.6, Math.sin(ang) * rad);
        var orb = null;
        try { orb = world.spawnEntity(loc, XB_EntityType.EXPERIENCE_ORB); }
        catch (e) { if (firstError === null) firstError = "spawn: " + e; }
        if (orb === null) continue;
        try { orb.setExperience(1 + Math.floor(Math.random() * 5)); }
        catch (e) { if (firstError === null) firstError = "exp: " + e; }
        try { orb.setVelocity(new XB_Vector((Math.random() - 0.5) * 1.2, 0.25 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2)); }
        catch (e) {}
        spawned++;
    }
    try { world.playSound(base, "entity.experience_orb.pickup", 1.0, 1.0); } catch (e) {}
    try { XB_Bukkit.getConsoleSender().sendMessage("[xpburst.js] spawned " + spawned + "/" + count + " orbs at " + player.getName() + (firstError === null ? "" : " (first error: " + firstError + ")")); } catch (e) {}
    return spawned;
}

addCommand("xpburst", {
    onCommand: function(sender, args) {
        var named = (args && args.length) ? XB_Bukkit.getPlayer(String(args[0])) : null;
        if (named !== null && !named.isOnline()) named = null;

        var who = named;
        if (who === null) {
            if (xbIsPlayer(sender)) {
                who = sender;
            } else {
                var online = XB_Bukkit.getOnlinePlayers().toArray();
                if (online.length === 1) who = online[0];
            }
        }
        if (who === null) { sender.sendMessage("Usage: /xpburst <player> [count]"); return; }

        var count = XB_DEFAULT;
        if (args && args.length > 1) {
            var n = parseInt(String(args[1]), 10);
            if (!isNaN(n) && n > 0) count = Math.min(n, XB_MAX);
        }

        task.main(function() {
            var spawned = xbBurst(who, count);
            if (xbIsPlayer(sender)) sender.sendMessage("Dropped " + spawned + " experience orbs on you.");
            else sender.sendMessage("Dropped " + spawned + " experience orbs on " + who.getName() + ".");
        });
    }
});
