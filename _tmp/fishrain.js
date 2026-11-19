// fishrain.js - /fishrain [player] [waves]
// Makes it rain fish: item entities dropped out of the sky above a player.

var FR_Bukkit = importClass("org.bukkit.Bukkit");
var FR_Material = importClass("org.bukkit.Material");
var FR_ItemStack = importClass("org.bukkit.inventory.ItemStack");

var FR_WAVES = 60;
var FR_PER_WAVE = 20;
var FR_INTERVAL_MS = 100;

function frLog(what) {
    try { FR_Bukkit.getConsoleSender().sendMessage("[fishrain.js] " + what); } catch (e) {}
}

function frIsPlayer(sender) {
    try { sender.getLocation(); return true; } catch (e) { return false; }
}

function frMaterials() {
    var out = [];
    var names = ["COD", "SALMON", "TROPICAL_FISH", "PUFFERFISH"];
    for (var i = 0; i < names.length; i++) {
        try { out.push(FR_Material[names[i]]); } catch (e) {}
    }
    return out;
}

function frStep(player, wavesLeft, mats, stats) {
    if (wavesLeft <= 0 || !player.isOnline()) {
        frLog("done: " + stats.dropped + " fish over " + player.getName() +
            (stats.error === null ? "" : " (first error: " + stats.error + ")"));
        return;
    }
    task.main(function() {
        var world = player.getWorld();
        var base = player.getLocation();
        for (var i = 0; i < FR_PER_WAVE; i++) {
            var mat = mats[0];
            try { mat = mats[Math.floor(Math.random() * mats.length)]; } catch (e) {}
            var ang = Math.random() * Math.PI * 2;
            var rad = Math.random() * 9.0;
            var loc = base.clone().add(Math.cos(ang) * rad, 14 + Math.random() * 10, Math.sin(ang) * rad);
            try {
                var stack = new FR_ItemStack(mat, 1);
                var item = world.dropItem(loc, stack);
                try { item.setPickupDelay(10); } catch (e) {}
                stats.dropped++;
            } catch (e) {
                if (stats.error === null) stats.error = String(e);
            }
        }
    });
    task.delay(FR_INTERVAL_MS, function() { frStep(player, wavesLeft - 1, mats, stats); });
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
            if (!isNaN(n) && n > 0) waves = Math.min(n, 200);
        }

        var mats = frMaterials();
        if (mats.length === 0) { sender.sendMessage("No fish materials available."); return; }

        frLog("starting " + (waves * FR_PER_WAVE) + " fish over " + who.getName());
        frStep(who, waves, mats, { dropped: 0, error: null });
        sender.sendMessage("Letting it rain fish on " + who.getName() + ".");
    }
});
