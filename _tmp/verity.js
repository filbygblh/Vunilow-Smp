// verity.js - /lordverity
//
// Lord Verity appears in front of the player as a real player NPC (FancyNpcs,
// wearing the Lord Verity skin) and "Master of Humanity" plays through the
// server resource pack.
//
// The NPC is the persistent FancyNpcs NPC "LordVerityShow". It is parked in
// empty sky far from anything when not summoned, moved in front of the player
// on use, and put back when the song ends (or on /lordverity stop), so it never
// has to be created or removed at runtime and nobody sees it by accident.
// Head tracking (turn_to_player) is on, so it follows players who walk by.
//
// NOTE: OpenJS task.delay counts MILLISECONDS, not ticks.
//
// Resource pack: the sound event is custom.lordverity, defined in
// resource-pack/assets/minecraft/sounds.json and served by server.properties.
// If the pack is not installed the command is silent, so the note-block theme
// stays available as a fallback (set LV_PACK_SOUND to "" to force it).

var LV_Bukkit = importClass("org.bukkit.Bukkit");
var LV_Vector = importClass("org.bukkit.util.Vector");
var LV_Sound = importClass("org.bukkit.Sound");
var LV_SoundCategory = importClass("org.bukkit.SoundCategory");
var LV_Particle = importClass("org.bukkit.Particle");

var LV_NPC = "LordVerityShow";             // FancyNpcs NPC name
var LV_PARK = { x: 30000, y: 200, z: 30000 }; // empty sky, out of sight
var LV_HOME_WORLD = "Spawn";
var LV_PACK_SOUND = "custom.lordverity";   // "" = note-block fallback
var LV_COOLDOWN_SECONDS = 120;             // between summons
var LV_LIFETIME_SECONDS = 150;             // the song is about 2:20
var LV_STEP_MS = 500;                      // fallback theme: half a second per step

var lvLast = 0;         // ms of last summon
var lvActive = false;   // NPC is currently on stage
var lvWhere = null;     // where he is standing

function lvIsPlayer(sender) {
    try { sender.getLocation(); return true; } catch (e) { return false; }
}

function lvOnline() { return LV_Bukkit.getOnlinePlayers().toArray(); }

function lvLog(what, e) {
    try { LV_Bukkit.getConsoleSender().sendMessage("§c[verity.js] " + what + ": " + e); } catch (x) {}
}

// ---------------------------------------------------------------- npc bridge
function lvNpc(args) {
    try { return LV_Bukkit.dispatchCommand(LV_Bukkit.getConsoleSender(), "npc " + args); }
    catch (e) { lvLog("npc " + args, e); return false; }
}

function lvNum(n) { return Math.round(n * 100) / 100; }

function lvPlace(loc) {
    lvNpc("move_to " + LV_NPC + " " + lvNum(loc.getX()) + " " + lvNum(loc.getY()) + " " +
        lvNum(loc.getZ()) + " " + loc.getWorld().getName());
    lvNpc("rotate " + LV_NPC + " " + lvNum(loc.getYaw()) + " 0");
    lvWhere = loc;
}

function lvPark(loc) {
    var world = loc === null ? LV_HOME_WORLD : loc.getWorld().getName();
    lvNpc("move_to " + LV_NPC + " " + LV_PARK.x + " " + LV_PARK.y + " " + LV_PARK.z + " " + world);
}

// ------------------------------------------------------------------ fallback
// [step, note-block index] - index 12 is F#4, the game allows 0 to 24.
var LV_MELODY = [
    [0, 20], [3, 19], [4, 20], [7, 15],
    [8, 16], [11, 15], [12, 13], [14, 11], [15, 10],
    [16, 20], [19, 23], [20, 20], [23, 15],
    [24, 16], [26, 18], [27, 19], [28, 20], [31, 20]
];
var LV_BASS = [[0, 8], [4, 4], [8, 1], [12, 3], [16, 8], [20, 4], [24, 1], [28, 3]];
var LV_DRUMS = [
    [0, "BASEDRUM", 1.0], [4, "SNARE", 0.7], [8, "BASEDRUM", 0.9], [12, "SNARE", 0.7],
    [16, "BASEDRUM", 1.0], [20, "SNARE", 0.7], [24, "BASEDRUM", 0.9], [28, "SNARE", 0.7], [30, "SNARE", 0.5]
];

function lvPitch(n) { return Math.pow(2, (n - 12) / 12); }

function lvNote(loc, sound, n, volume) {
    try { loc.getWorld().playSound(loc, sound, volume, lvPitch(n)); } catch (e) {}
}

function lvMusic(loc) {
    var i;
    for (i = 0; i < LV_MELODY.length; i++) {
        (function(step, note) {
            task.delay(step * LV_STEP_MS, function() { lvNote(loc, LV_Sound.BLOCK_NOTE_BLOCK_PLING, note, 0.9); });
        })(LV_MELODY[i][0], LV_MELODY[i][1]);
    }
    for (i = 0; i < LV_BASS.length; i++) {
        (function(step, note) {
            task.delay(step * LV_STEP_MS, function() { lvNote(loc, LV_Sound.BLOCK_NOTE_BLOCK_BASS, note, 1.0); });
        })(LV_BASS[i][0], LV_BASS[i][1]);
    }
    for (i = 0; i < LV_DRUMS.length; i++) {
        (function(step, kind, volume) {
            task.delay(step * LV_STEP_MS, function() {
                lvNote(loc, kind === "SNARE" ? LV_Sound.BLOCK_NOTE_BLOCK_SNARE : LV_Sound.BLOCK_NOTE_BLOCK_BASEDRUM, 12, volume);
            });
        })(LV_DRUMS[i][0], LV_DRUMS[i][1], LV_DRUMS[i][2]);
    }
}

// ------------------------------------------------------------------- visuals
function lvBurst(loc) {
    try { loc.getWorld().spawnParticle(LV_Particle.SOUL, loc.clone().add(0, 1, 0), 60, 0.7, 1.1, 0.7, 0.02); } catch (e) {}
}

// A slow soul aura around him while he is on stage, one puff a second.
function lvAura(left) {
    if (left <= 0) return;
    task.delay(1000, function() {
        if (!lvActive) return;
        task.main(function() {
            if (!lvActive || lvWhere === null) return;
            try {
                lvWhere.getWorld().spawnParticle(LV_Particle.SOUL, lvWhere.clone().add(0, 1.2, 0), 3, 0.45, 0.9, 0.45, 0.01);
            } catch (e) {}
        });
        lvAura(left - 1);
    });
}

function lvDismiss() {
    if (!lvActive) return;
    try {
        if (lvWhere !== null) {
            lvWhere.getWorld().stopSound(lvWhere, LV_PACK_SOUND, LV_SoundCategory.RECORDS);
            lvBurst(lvWhere);
            lvPark(lvWhere);
        }
    } catch (e) { lvLog("dismiss", e); }
    lvWhere = null;
    lvActive = false;
}

// ------------------------------------------------------------------- command
function lvSummon(sender) {
    var name = String(sender.getName());
    var now = Date.now();
    if (lvActive) { sender.sendMessage("§cLord Verity is already here. §7(/lordverity stop)"); return; }
    if (lvLast && now - lvLast < LV_COOLDOWN_SECONDS * 1000) {
        sender.sendMessage("§cLord Verity is still fading. Try again in " +
            Math.ceil((LV_COOLDOWN_SECONDS * 1000 - (now - lvLast)) / 1000) + "s.");
        return;
    }

    task.main(function() {
        var base = sender.getLocation();
        var dir;
        try {
            dir = base.getDirection();
            dir.setY(0);
            if (dir.lengthSquared() < 0.01) dir = new LV_Vector(0, 0, 1);
            dir.normalize();
        } catch (e) { dir = new LV_Vector(0, 0, 1); }

        var loc = base.clone().add(dir.multiply(2.5));
        loc.setYaw(base.getYaw() + 180);
        loc.setPitch(0);

        lvPlace(loc);
        lvLast = Date.now();
        lvActive = true;

        var arr = lvOnline();
        for (var i = 0; i < arr.length; i++) {
            try {
                if (arr[i].getWorld().equals(loc.getWorld()) && arr[i].getLocation().distance(loc) <= 60) {
                    arr[i].sendMessage("§6§lLORD VERITY §8» §7He has arrived.");
                }
            } catch (e) {}
        }
        sender.sendMessage("§6§lLORD VERITY §8» §7He has arrived.");
        lvBurst(loc);
        lvAura(60);

        if (LV_PACK_SOUND !== "" && LV_SoundCategory !== null) {
            try { loc.getWorld().playSound(loc, LV_PACK_SOUND, LV_SoundCategory.RECORDS, 1.0, 1.0); }
            catch (e) { lvLog("pack sound", e); lvMusic(loc); }
        } else {
            lvMusic(loc);
        }

        task.delay(LV_LIFETIME_SECONDS * 1000, function() {
            task.main(function() {
                if (!lvActive) return;
                var arr2 = lvOnline();
                for (var j = 0; j < arr2.length; j++) {
                    try {
                        if (lvWhere !== null && arr2[j].getWorld().equals(lvWhere.getWorld()) &&
                            arr2[j].getLocation().distance(lvWhere) <= 60) {
                            arr2[j].sendMessage("§6§lLORD VERITY §8» §7He is gone.");
                        }
                    } catch (e) {}
                }
                lvDismiss();
            });
        });
    });
}

addCommand("lordverity", {
    onCommand: function(sender, args) {
        var first = (args && args.length) ? String(args[0]).toLowerCase() : "";

        if (lvIsPlayer(sender)) {
            if (first === "stop") {
                task.main(function() {
                    if (!lvActive) { sender.sendMessage("§7Lord Verity is not here."); return; }
                    lvDismiss();
                    sender.sendMessage("§6§lLORD VERITY §8» §7He is gone.");
                });
                return;
            }
            lvSummon(sender);
            return;
        }

        if (first === "stop") {
            task.main(function() { lvDismiss(); });
            sender.sendMessage("§7Lord Verity dismissed.");
            return;
        }

        var target = first === "" ? null : LV_Bukkit.getPlayer(String(args[0]));
        if (target === null || !target.isOnline()) {
            sender.sendMessage("§cConsole usage: /lordverity <player> | /lordverity stop");
            return;
        }
        lvSummon(target);
    }
});
