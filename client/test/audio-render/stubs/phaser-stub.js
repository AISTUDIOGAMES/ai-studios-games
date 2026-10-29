// Stub minimo do Phaser so para montar a interface (main.ts) no navegador sem a engine grafica.
class Scene { constructor(k) { this.k = k; } }
class Game { constructor(c) { this.config = c; } }
export default { Scene, Game, AUTO: 0, WEBGL: 2, BlendModes: { ADD: 1, NORMAL: 0 }, Scenes: { Events: { SHUTDOWN: "shutdown" } }, Scale: { FIT: 1, CENTER_BOTH: 1 }, GameObjects: {}, Utils: { Array: { Shuffle: (a) => a } } };
