let pixi_app = new PIXI.Application({width: 960, height: 960});

rgb2hex = PIXI.utils.rgb2hex;
Graphics = PIXI.Graphics;

// Globals
CELL_SIZE = 32

// Utilities
cost_to_color = function(cost) {
    var MAX_COST = 200;
    var MAX_GREY = 150;
    if (cost > MAX_COST) {
        cost = MAX_COST
    }
    var neg_gray = parseInt(cost / MAX_COST * MAX_GREY);
    var gray = 255 - neg_gray;
    return rgb2hex([gray/255, gray/255, gray/255]);

}
var ID_COLORS = [0xDDDDDD, 0xE6194B, 0x3Cb44B, 0xFFE119, 0x0082C8, 0xF58231, 
    0x911EB4, 0x46F0F0, 0xF032E6, 0xD2F53C, 0x008080, 
    0xAA6E28, 0x800000, 0xAAFFC3, 0x808000, 0x000080, 0xFABEBE, 0xE6BEFF]
id_to_color = function(uid) {
    if (uid < ID_COLORS.length) {
        return ID_COLORS[uid];
    } else {
        return 0x123456;
    }
}

// Update functions
update_frame = function(data) {
    // Clear stage
    while (pixi_app.stage.children[0]) {
        pixi_app.stage.removeChild(pixi_app.stage.children[0]);
    }
    draw_gamemap(data['game_map']);
}

draw_gamemap = function(data) {
    for (y in data) {
        for (x in data[y]) {
            var cell = data[y][x];
            draw_cell(cell);
        }
    }
}

draw_cell = function(data) {
    var corner_x = CELL_SIZE * data.position[0];
    var corner_y = CELL_SIZE * data.position[1];
    // Base color
    let base = new Graphics();
    
    base.beginFill(cost_to_color(data['natural_cost']));
    base.drawRect(corner_x, 
            corner_y, 
            CELL_SIZE, 
            CELL_SIZE)
    base.endFill();

    pixi_app.stage.addChild(base);

    // User color
    if (data.owner != 0) {
        user_flag = new Graphics();
        user_flag.beginFill(id_to_color(data.owner));
        user_flag.drawRoundedRect(corner_x+5, corner_y+5, CELL_SIZE-10, CELL_SIZE-10, 3);
        user_flag.endFill();
        pixi_app.stage.addChild(user_flag);
    }

}

pixi_setup = function(app) {
    app.renderer.backgroundColor = 0x111111;
}
$(function() {
    var wsUri = (window.location.protocol=='https:'&&'wss://'||'ws://') + window.location.host + '/game_channel';
    var conn = new WebSocket(wsUri)
    conn.onmessage = function(e) {
        update_frame(JSON.parse(e.data))
    }
    document.body.appendChild(pixi_app.view)
    pixi_setup(pixi_app)
})
