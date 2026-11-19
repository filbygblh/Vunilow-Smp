// probe.js - temporary: measures task.delay units. Safe to delete.
var PB_B = importClass("org.bukkit.Bukkit");

function pbStamp(tag) {
    try { PB_B.getConsoleSender().sendMessage("[probe] " + tag + " at " + Date.now()); } catch (e) {}
}

pbStamp("load");
task.delay(20, function() { pbStamp("delay20"); });
task.delay(100, function() { pbStamp("delay100"); });
task.delay(1000, function() { pbStamp("delay1000"); });
task.delay(3000, function() { pbStamp("delay3000"); });
