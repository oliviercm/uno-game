module.exports = (server) => {
  // Global chat socket
  const GlobalChatManager = require("../managers/GlobalChatManager");
  require("socket.io")(server, { path: "/global-chat/" })
    .use((socket, next) => {
      require("../middleware/session")(socket.request, {}, next);
    })
    .use((socket, next) => {
      if (socket?.request?.session?.passport?.user) {
        next();
      } else {
        next(new Error("Not logged in."));
      }
    })
    .on("connection", socket => {
      console.log(`User connected to /global-chat/ socket: ${JSON.stringify({
        user_id: socket.request.session.passport.user.user_id,
        username: socket.request.session.passport.user.username,
      })}`);
      GlobalChatManager.connect(socket);
    });
}