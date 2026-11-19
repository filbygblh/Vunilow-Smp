// fishrain.js - /fishrain [player] [count]
// Rains LIVE fish: real cod, salmon, tropical fish and pufferfish mobs spawned
// in one burst above the player, so they fall and flop around.

var FR_Bukkit = importClass("org.bukkit.Bukkit");
var FR_EntityType = importClass("org.bukkit.entity.EntityType");

var FR_COUNT = 500;
var FR_MAX = 2000;

function frLog(what) {
    try { FR_Bukkit.getConsoleSender().sendMessage("[fishrain.js] " + what); } catch (e) {}
}

function frIsPlayer(sender) {
    try { sender.getLocation(); return true; } catch (e) { return false; }
}

function frTypes() {
    var out = [];
    var names = ["COD", "SALMON", "TROPICAL_FISH", "PUFFERFISH"];
    for (var i = 0; i < names.length; i++) {
        try {
            var t = FR_EntityType[names[i]];
            if (t !== null && t !== undefined) out.push(t);
        } catch (e) {}
    }
    return out;
}

function frRain(player, count, types) {
    var world = player.getWorld();
    var base = player.getLocation();
    var dropped = 0;
    var firstError = null;
    for (var i = 0; i < count; i++) {
        var type = types[0];
        try { type = types[Math.floor(Math.random() * types.length)]; } catch (e) {}
        var ang = Math.random() * Math.PI * 2;
        var rad = Math.random() * 10.0;
        var loc = base.clone().add(Math.cos(ang) * rad, 15 + Math.random() * 12, Math.sin(ang) * rad);
        try { world.spawnEntity(loc, type); dropped++; }
        catch (e) { if (firstError === null) firstError = String(e); }
    }
    frLog(dropped + "/" + count + " live fish over " + player.getName() +
        (firstError === null ? "" : " (first error: " + firstError + ")"));
    return dropped;
}

addCommand("fishrain", {
    onCommand: function(sender, args) {
        var who = (args && args.length) ? FR_Bukkit.getPlayer(String(args[0])) : null;
        if (who !== null && !who.isOnline()) who = null;
        if (who === null) {
            if (frIsPlayer(sender)) who = sender;
            else {
                var online = FR_Bukkit.getOnlinePlayers().toArray();
                if (online.length === 1) who = online[0];
            }
        }
        if (who === null) { sender.sendMessage("Usage: /fishrain <player> [count]"); return; }

        var count = FR_COUNT;
        if (args && args.length > 1) {
            var n = parseInt(String(args[1]), 10);
            if (!isNaN(n) && n > 0) count = Math.min(n, FR_MAX);
        }

        var types = frTypes();
        if (types.length === 0) { sender.sendMessage("No fish entity types available."); return; }

        var dropped = frRain(who, count, types);
        sender.sendMessage("Rained " + dropped + " live fish on " + who.getName() + ".");
    }
});
