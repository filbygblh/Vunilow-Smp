// verity.js - /lordverity
//
// Lord Verity (the Horror Skunx song character) appears in front of the
// player as a real player NPC (FancyNpcs, skin set to the Lord Verity skin)
// and "Master of Humanity" plays through the server resource pack.
//
// The NPC is the persistent FancyNpcs NPC "LordVerityShow". It is parked far
// away when not summoned, moved in front of the player on use, and moved back
// when the song ends, so it never has to be created or removed at runtime.
// Head tracking (turn_to_player) is on, so it follows players who walk by.
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
var LV_PACK_SOUND = "custom.lordverity";   // "" = note-block fallback
var LV_COOLDOWN_SECONDS = 120;             // between summons
var LV_LIFETIME_SECONDS = 150;             // the song is about 2:20
var LV_STEP_TICKS = 10;                    // fallback theme: half a second per step
var LV_PARK = { x: 30000, y: -200, z: 30000 }; // out of sight between summons

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
            task.delay(step * LV_STEP_TICKS, function() { lvNote(loc, LV_Sound.BLOCK_NOTE_BLOCK_PLING, note, 0.9); });
        })(LV_MELODY[i][0], LV_MELODY[i][1]);
    }
    for (i = 0; i < LV_BASS.length; i++) {
        (function(step, note) {
            task.delay(step * LV_STEP_TICKS, function() { lvNote(loc, LV_Sound.BLOCK_NOTE_BLOCK_BASS, note, 1.0); });
        })(LV_BASS[i][0], LV_BASS[i][1]);
    }
    for (i = 0; i < LV_DRUMS.length; i++) {
        (function(step, kind, volume) {
            task.delay(step * LV_STEP_TICKS, function() {
                lvNote(loc, kind === "SNARE" ? LV_Sound.BLOCK_NOTE_BLOCK_SNARE : LV_Sound.BLOCK_NOTE_BLOCK_BASEDRUM, 12, volume);
            });
        })(LV_DRUMS[i][0], LV_DRUMS[i][1], LV_DRUMS[i][2]);
    }
}

// ------------------------------------------------------------------- visuals
function lvBurst(loc) {
    try { loc.getWorld().spawnParticle(LV_Particle.SOUL, loc.clone().add(0, 1, 0), 60, 0.7, 1.1, 0.7, 0.02); } catch (e) {}
}

// A slow soul aura around him while he is on stage (60 seconds, one tick a second).
function lvAura(loc, left) {
    if (left <= 0) return;
    task.delay(20, function() {
        if (!lvActive || lvWhere === null) return;
        try {
            loc.getWorld().spawnParticle(LV_Particle.SOUL, lvWhere.clone().add(0, 1.2, 0), 3, 0.45, 0.9, 0.45, 0.01);
        } catch (e) {}
        lvAura(loc, left - 20);
    });
}

// ------------------------------------------------------------------- command
addCommand("lordverity", {
    onCommand: function(sender, args) {
        if (!lvIsPlayer(sender)) { sender.sendMessage("§cOnly players can summon Lord Verity."); return; }
        var name = String(sender.getName());
        var now = Date.now();
        if (lvActive) { sender.sendMessage("§cLord Verity is already here."); return; }
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
            lvAura(loc, 1200);

            if (LV_PACK_SOUND !== "" && LV_SoundCategory !== null) {
                try { loc.getWorld().playSound(loc, LV_PACK_SOUND, LV_SoundCategory.RECORDS, 1.0, 1.0); }
                catch (e) { lvLog("pack sound", e); lvMusic(loc); }
            } else {
                lvMusic(loc);
            }

            task.delay(LV_LIFETIME_SECONDS * 20, function() {
                task.main(function() {
                    try {
                        if (lvWhere !== null) {
                            lvWhere.getWorld().stopSound(lvWhere, LV_PACK_SOUND, LV_SoundCategory.RECORDS);
                            lvBurst(lvWhere);
                            lvNpc("move_to " + LV_NPC + " " + LV_PARK.x + " " + LV_PARK.y + " " +
                                LV_PARK.z + " " + lvWhere.getWorld().getName());
                        }
                    } catch (e) { lvLog("dismiss", e); }
                    lvWhere = null;
                    lvActive = false;
                });
            });
        });
    }
});
