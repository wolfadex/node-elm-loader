import Elm from "./Main.elm";

const app = Elm.Main.init({ flags: 0 });

app.ports.count.subscribe(function (value) {
  console.log(value);
});

app.ports.incrementBy.send(2);
app.ports.incrementBy.send(64);
