//TODO: make this self-contained.
//TODO: re-define security checks
function ServerConnection(server, legion) {
    this.legion = legion;
    this.server = server;
    this.remoteID = this.server.ip + ":" + this.server.port;

    this.socket = new WebSocket("ws://" + this.server.ip + ":" + this.server.port + "");

    var sc = this;
    this.socket.onopen = function open() {
        sc.socket.send(legion.secure.getServerAuthenticationChallenge());
        //sc.legion.connectionManager.onOpenServer(sc);
    };

    this.socket.onmessage = function (event) {
        var m = JSON.parse(event.data);
        console.log("Got " + m.type + " from " + sc.remoteID + " s: " + m.sender);

        if (m.auth) {
            legion.secure.gotServerAuthenticationResult(m.auth);
            if (m.auth.result == "Success") {
                sc.legion.connectionManager.onOpenServer(sc);
            }
        } else {
            var original = JSON.parse(event.data);
            if (m.content) {
                decompress(m.content, function (result) {
                    m.content = JSON.parse(result);
                    sc.legion.messagingAPI.onMessage(sc, m, original);
                });
            } else {
                //TODO: this is an expensive fix. fix it better.
                decompress("5d00000100040000000000000000331849b7e4c02e1ffffac8a000", function (result) {
                    sc.legion.messagingAPI.onMessage(sc, m, original);
                });
            }
        }
    };

    this.socket.onclose = function () {
        sc.legion.connectionManager.onCloseServer(sc);
    };

    this.socket.onerror = function (event) {
        console.error("ServerSocket Error", event);
    };

}

ServerConnection.prototype.close = function () {
    this.socket.close();
};
ServerConnection.prototype.isAlive = function () {
    return this.socket && this.socket.readyState == WebSocket.OPEN;
};

ServerConnection.prototype.send = function (message) {
    //TODO: define and confirm message type
    if (message.N) {
        //No op. Server will handle it.
    }
    if (typeof message == "object") {
        message = JSON.stringify(message);
    }
    if (this.socket.readyState == WebSocket.OPEN) {
        console.log("Sent " + JSON.parse(message).type + " to " + this.remoteID + " s: " + JSON.parse(message).sender);
        this.socket.send(message);
    }
};