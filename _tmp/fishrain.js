// fishrain.js - /fishrain [player] [waves]
// Makes it rain LIVE fish: real cod, salmon, tropical fish and pufferfish mobs
// dropped out of the sky above a player. They fall, flop about, and expire.

var FR_Bukkit = importClass("org.bukkit.Bukkit");
var FR_EntityType = importClass("org.bukkit.entity.EntityType");

var FR_WAVES = 5;
var FR_PER_WAVE = 100;
var FR_INTERVAL_MS = 400;

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

function frDrop(player, types, stats) {
    var world = player.getWorld();
    var base = player.getLocation();
    for (var i = 0; i < FR_PER_WAVE; i++) {
        var type = types[0];
        try { type = types[Math.floor(Math.random() * types.length)]; } catch (e) {}
        var ang = Math.random() * Math.PI * 2;
        var rad = Math.random() * 10.0;
        var loc = base.clone().add(Math.cos(ang) * rad, 15 + Math.random() * 12, Math.sin(ang) * rad);
        try { world.spawnEntity(loc, type); stats.dropped++; }
        catch (e) { if (stats.error === null) stats.error = String(e); }
    }
}

function frWave(player, left, types, stats) {
    if (left <= 0 || !player.isOnline()) {
        frLog("done: " + stats.dropped + " live fish over " + player.getName() +
            (stats.error === null ? "" : " (first error: " + stats.error + ")"));
        return;
    }
    task.delay(FR_INTERVAL_MS, function() {
        task.main(function() { frDrop(player, types, stats); });
        frWave(player, left - 1, types, stats);
    });
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
        if (who === null) { sender.sendMessage("Usage: /fishrain <player> [waves]"); return; }

        var waves = FR_WAVES;
        if (args && args.length > 1) {
            var n = parseInt(String(args[1]), 10);
            if (!isNaN(n) && n > 0) waves = Math.min(n, 20);
        }

        var types = frTypes();
        if (types.length === 0) { sender.sendMessage("No fish entity types available."); return; }

        frLog("starting " + (waves * FR_PER_WAVE) + " LIVE fish over " + who.getName());
        frWave(who, waves, types, { dropped: 0, error: null });
        sender.sendMessage("Live fish incoming on " + who.getName() + ".");
    }
});
