"use strict";

function generateRandomNumber(min, max) {
  const randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
  return randomNumber;
}

const TILE_TYPE = {
  wall: 0,
  floor: 1,
  hero: 2,
  enemy: 3,
  sword: 4,
  healingPotion: 5,
};

const MOVE_EVENT_TYPE = {
  moveUp: 0,
  moveRigth: 1,
  moveDown: 2,
  moveLeft: 3,
  attack: 4,
};

const HERO_ACTION_TYPE = {
  upgrateAttackPower: 0,
  useHealingPotion: 1,
  takeDamage: 2,
};

class Game {
  hero = new Hero();
  enemies = Enemy.createManyEnemy(10);
  gameMap = new GameMap(this.hero, this.enemies);
  render = new Render(this.gameMap);

  start() {
    this.firstRender();

    const gameTick = setInterval(() => {
      this.gameMap.makeActions();

      if (this.hero.health <= 0) {
        clearInterval(gameTick);
        confirm("Проигрыш");
      }

      this.render.makeRender();
    }, 100);
  }

  firstRender() {
    new GameMapGenerator().generateMap(this.gameMap);
    this.render.makeRender();
  }
}

class GameMap {
  map = [];
  width = 40;
  height = 24;

  gameMapGenerator = new GameMapGenerator();

  constructor(hero, enemies) {
    this.hero = hero;
    this.enemies = enemies;
  }

  makeActions() {
    const heroMove = this.hero.getMoveEvent();

    if (heroMove !== null) {
      this.makeHeroMove(heroMove);
    }

    this.makeEnemiesMove();
  }

  makeEnemiesMove() {
    this.enemies.forEach((enemy) => {
      if (enemy.health <= 0) return;

      if (enemy.skip !== 10) {
        enemy.skip++;
        return;
      }

      const canAttack =
        Math.abs(enemy.x - this.hero.x) + Math.abs(enemy.y - this.hero.y) === 1;

      if (canAttack) {
        this.hero.health -= 10;
        enemy.skip = 0;
        return;
      }

      const enemyTile = { x: enemy.x, y: enemy.y, type: TILE_TYPE.enemy };

      const randomMove = generateRandomNumber(0, 3);
      const nextTile = this.getNextTile(
        {
          x: enemy.x,
          y: enemy.y,
        },
        randomMove
      );

      if (!nextTile) return;

      if (nextTile.type === TILE_TYPE.floor) {
        this.swapTiles(enemyTile, nextTile);
        enemy.x = nextTile.x;
        enemy.y = nextTile.y;
      }

      enemy.skip = 0;
    });
  }

  makeHeroMove(heroMove) {
    if (heroMove === MOVE_EVENT_TYPE.attack) {
      this.enemies.forEach((enemy) => {
        const canAttack =
          Math.abs(enemy.x - this.hero.x) + Math.abs(enemy.y - this.hero.y) ===
          1;
        if (canAttack) {
          enemy.health -= 10 * this.hero.attackPower;
          if (enemy.health <= 0) {
            this.map[enemy.y][enemy.x] = TILE_TYPE.floor;
          }
        }
      });
    }

    const heroTile = { x: this.hero.x, y: this.hero.y, type: TILE_TYPE.hero };

    const nextTile = this.getNextTile(
      {
        x: this.hero.x,
        y: this.hero.y,
      },
      heroMove
    );

    if (!nextTile) return;

    if (nextTile.type === TILE_TYPE.floor) {
      this.swapTiles(heroTile, nextTile);
      this.hero.x = nextTile.x;
      this.hero.y = nextTile.y;
    }

    if (nextTile.type === TILE_TYPE.sword) {
      this.swapTiles(heroTile, nextTile);
      this.hero.upgrateAttackPower();
      this.hero.x = nextTile.x;
      this.hero.y = nextTile.y;
    }

    if (nextTile.type === TILE_TYPE.healingPotion) {
      this.swapTiles(heroTile, nextTile);
      this.hero.useHealingPotion();
      this.hero.x = nextTile.x;
      this.hero.y = nextTile.y;
    }
  }

  swapTiles(firstTile, secondTile) {
    this.map[firstTile.y][firstTile.x] = TILE_TYPE.floor;
    this.map[secondTile.y][secondTile.x] = firstTile.type;
  }

  getNextTile(position, moveEvent) {
    const nextTile = { x: position.x, y: position.y };

    if (moveEvent === MOVE_EVENT_TYPE.moveUp) {
      if (nextTile.y - 1 < 0) return;
      nextTile.y -= 1;
    }

    if (moveEvent === MOVE_EVENT_TYPE.moveRigth) {
      if (nextTile.x + 1 > this.width - 1) return;
      nextTile.x += 1;
    }

    if (moveEvent === MOVE_EVENT_TYPE.moveDown) {
      if (nextTile.y + 1 > this.height - 1) return;
      nextTile.y += 1;
    }

    if (moveEvent === MOVE_EVENT_TYPE.moveLeft) {
      if (nextTile.x - 1 < 0) return;
      nextTile.x -= 1;
    }

    nextTile.type = this.map[nextTile.y][nextTile.x];

    return nextTile;
  }
}

class GameMapGenerator {
  generateMap(gameMap) {
    this.gameMap = gameMap;
    this.generateOnlyWall();
    this.generatePassages();
    this.generateRooms();
    this.generateHero();
    this.generateEnemies();
    this.generateHealingPotions();
    this.generateSwords();

    return {
      map: this.map,
      heroPosition: this.heroPosition,
      enemiesPosition: this.enemiesPosition,
    };
  }

  generateOnlyWall() {
    const row = [];

    for (let i = 0; i < this.gameMap.width; i++) {
      row.push(TILE_TYPE.wall);
    }

    for (let i = 0; i < this.gameMap.height; i++) {
      this.gameMap.map.push([...row]);
    }
  }

  generatePassages() {
    const verticalCount = generateRandomNumber(3, 5);
    const horizontalCount = generateRandomNumber(3, 5);

    const verticalIndexs = this.generateUniqueIndexs(
      this.gameMap.width - 1,
      verticalCount
    );

    const horizontalIndexs = this.generateUniqueIndexs(
      this.gameMap.height - 1,
      horizontalCount
    );

    horizontalIndexs.forEach((horizontalIndex) => {
      for (let i = 0; i < this.gameMap.width; i++) {
        this.gameMap.map[horizontalIndex][i] = TILE_TYPE.floor;
      }
    });

    verticalIndexs.forEach((verticalIndex) => {
      for (let i = 0; i < this.gameMap.height; i++) {
        this.gameMap.map[i][verticalIndex] = TILE_TYPE.floor;
      }
    });
  }

  generateUniqueIndexs(maxIndex, count) {
    const indexs = [];
    while (indexs.length < count) {
      const index = generateRandomNumber(0, maxIndex);
      if (!indexs.includes(index)) {
        indexs.push(index);
      }
    }

    return indexs;
  }

  generateRooms() {
    const roomsCount = generateRandomNumber(5, 10);
    const rooms = [];

    while (rooms.length < roomsCount) {
      for (let i = 0; i < roomsCount; i++) {
        const room = this.createRandomRoom();

        const isValidRoom = this.checkIsValidRoom(room);

        if (isValidRoom) {
          rooms.push(room);
        }
      }
    }

    this.createRooms(rooms);
  }

  createRandomRoom() {
    const roomWidth = generateRandomNumber(3, 8);
    const roomHeight = generateRandomNumber(3, 8);

    const startCoord = this.getRandomCoord(
      this.gameMap.height - 1 - roomHeight,
      this.gameMap.width - 1 - roomWidth
    );

    const endCoord = {
      y: startCoord.y + roomHeight,
      x: startCoord.x + roomWidth,
    };

    return { startCoord, endCoord };
  }

  checkIsValidRoom(room) {
    for (let i = room.startCoord.x; i <= room.endCoord.x; i++) {
      if (
        room.startCoord.y - 1 > 0 &&
        this.gameMap.map[room.startCoord.y - 1][i] === TILE_TYPE.floor
      ) {
        return true;
      }

      if (
        room.endCoord.y + 1 < this.height &&
        this.gameMap.map[room.endCoord.y + 1][i] === TILE_TYPE.floor
      ) {
        return true;
      }
    }

    for (let i = room.startCoord.y; i <= room.endCoord.y; i++) {
      if (
        room.startCoord.x - 1 > 0 &&
        this.gameMap.map[i][room.startCoord.x - 1] === TILE_TYPE.floor
      ) {
        return true;
      }

      if (
        room.endCoord.x + 1 < this.width &&
        this.map[i][room.endCoord.x + 1] === TILE_TYPE.floor
      ) {
        return true;
      }
    }

    return false;
  }

  createRooms(rooms) {
    rooms.forEach((room) => {
      for (let i = room.startCoord.y; i <= room.endCoord.y; i++) {
        for (let j = room.startCoord.x; j <= room.endCoord.x; j++) {
          this.gameMap.map[i][j] = TILE_TYPE.floor;
        }
      }
    });
  }

  generateHero() {
    this.generateUniqueObjects(TILE_TYPE.hero, 1, (index, x, y) => {
      this.gameMap.hero.x = x;
      this.gameMap.hero.y = y;
    });
  }

  generateEnemies() {
    this.generateUniqueObjects(TILE_TYPE.enemy, 10, (index, x, y) => {
      this.gameMap.enemies[index].x = x;
      this.gameMap.enemies[index].y = y;
    });
  }

  generateSwords() {
    this.generateUniqueObjects(TILE_TYPE.sword, 2);
  }

  generateHealingPotions() {
    this.generateUniqueObjects(TILE_TYPE.healingPotion, 10);
  }

  generateUniqueObjects(TILE_TYPEProp, count, callback) {
    let currentCount = 0;

    while (currentCount < count) {
      const tile = this.getRandomCoord(
        this.gameMap.height - 1,
        this.gameMap.width - 1
      );

      if (this.gameMap.map[tile.y][tile.x] === TILE_TYPE.floor) {
        this.gameMap.map[tile.y][tile.x] = TILE_TYPEProp;
        if (callback) {
          callback(currentCount, tile.x, tile.y);
        }
        currentCount++;
      }
    }
  }

  getRandomCoord(limitY, limitX) {
    const y = generateRandomNumber(0, limitY);
    const x = generateRandomNumber(0, limitX);

    return { y, x };
  }
}

class Render {
  cameraSize = { x: 21, y: 13 };
  htmlField = document.querySelector(".field");

  constructor(gameMap) {
    this.gameMap = gameMap;
  }

  CLASS_TILE_TYPE = {
    0: "tileW",
    1: "tile",
    2: "tileP",
    3: "tileE",
    4: "tileSW",
    5: "tileHP",
  };

  makeRender() {
    const startPosition = this.calculateStartCameraPosition();

    this.htmlField.innerHTML = "";

    for (
      let y = startPosition.y;
      y < this.cameraSize.y + startPosition.y;
      y++
    ) {
      for (
        let x = startPosition.x;
        x < this.cameraSize.x + startPosition.x;
        x++
      ) {
        const tile = this.createHtmlTile();
        tile.classList.add(this.CLASS_TILE_TYPE[this.gameMap.map[y][x]]);

        if (this.gameMap.map[y][x] === TILE_TYPE.hero) {
          const health = this.createHtmlHealth();
          health.style.width = this.gameMap.hero.health + "%";
          tile.append(health);
        }

        if (this.gameMap.map[y][x] === TILE_TYPE.enemy) {
          this.gameMap.enemies.forEach((enemy) => {
            if (y === enemy.y && x === enemy.x) {
              const health = this.createHtmlHealth();
              health.style.width = enemy.health + "%";
              tile.append(health);
            }
          });
        }

        tile.style.top = (y - startPosition.y) * 50 + "px";
        tile.style.left = (x - startPosition.x) * 50 + "px";

        this.htmlField.append(tile);
      }
    }
  }

  calculateStartCameraPosition() {
    const cameraPosition = { x: this.gameMap.hero.x, y: this.gameMap.hero.y };

    for (let i = 0; i < this.cameraSize.y / 2; i++) {
      if (cameraPosition.y - 1 < 0) {
        break;
      }

      cameraPosition.y--;
    }

    for (let i = 0; i < this.cameraSize.x / 2; i++) {
      if (cameraPosition.x - 1 < 0) {
        break;
      }

      cameraPosition.x--;
    }

    while (true) {
      if (cameraPosition.x + this.cameraSize.x <= this.gameMap.width) {
        break;
      }

      cameraPosition.x--;
    }

    while (true) {
      if (cameraPosition.y + this.cameraSize.y <= this.gameMap.height) {
        break;
      }

      cameraPosition.y--;
    }

    return cameraPosition;
  }

  createHtmlTile() {
    const tile = document.createElement("div");
    tile.classList.add("tile");

    return tile;
  }

  createHtmlHealth() {
    const health = document.createElement("div");
    health.classList.add("health");

    return health;
  }
}

class Hero {
  moveEvents = [];

  x = null;
  y = null;

  health = 100;
  attackPower = 1;

  constructor() {
    this.heroEventListener();
  }

  heroEventListener() {
    document.addEventListener("keydown", (event) => {
      if (event.code === "KeyW") {
        this.moveEvents.push(MOVE_EVENT_TYPE.moveUp);
      }

      if (event.code === "KeyD") {
        this.moveEvents.push(MOVE_EVENT_TYPE.moveRigth);
      }

      if (event.code === "KeyS") {
        this.moveEvents.push(MOVE_EVENT_TYPE.moveDown);
      }

      if (event.code === "KeyA") {
        this.moveEvents.push(MOVE_EVENT_TYPE.moveLeft);
      }

      if (event.code === "Space") {
        this.moveEvents.push(MOVE_EVENT_TYPE.attack);
      }
    });
  }

  getMoveEvent() {
    const moveEvents = [...this.moveEvents];
    this.moveEvents = [];
    return moveEvents[0];
  }

  upgrateAttackPower() {
    this.attackPower++;
  }

  useHealingPotion() {
    this.health += 50;
    if (this.health > 100) {
      this.health = 100;
    }
  }

  makeAction(heroAction) {
    if (heroAction === HERO_ACTION_TYPE.upgrateAttackPower) {
      this.upgrateAttackPower();
    }

    if (heroAction === HERO_ACTION_TYPE.useHealingPotion) {
      this.useHealingPotion();
    }
  }
}

class Enemy {
  x = null;
  y = null;
  health = 100;
  skip = 0;

  static createManyEnemy(count) {
    const enemies = [];
    for (let i = 0; i < count; i++) {
      enemies.push(new Enemy());
    }

    return enemies;
  }
}

const game = new Game();

game.start();
