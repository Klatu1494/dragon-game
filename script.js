addEventListener('load', () => {
  function Point(x, y) {
    this.x = x;
    this.y = y;
  }

  function Level(town, paths, eggs, enemies) {
    this.town = town;
    this.paths = paths;
    this.eggs = eggs;
    this.enemies = enemies;
  }

  Level.prototype.draw = function() {
    mapCtx.fillStyle = '#246E23';
    mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.fillStyle = '#28231D';
    mapCtx.beginPath();
    mapCtx.ellipse(this.eggs.x, this.eggs.y, 20, 20, 0, 0, 2 * Math.PI);
    mapCtx.fill();
    mapCtx.beginPath();
    for (var path of this.paths) {
      mapCtx.moveTo(this.town.x, this.town.y);
      for (var node of path)
        mapCtx.lineTo(node.x, node.y);
      mapCtx.lineTo(this.eggs.x, this.eggs.y);
    }
    mapCtx.stroke();
  };

  Level.prototype.init = function() {
    position = this.eggs;
    angle = Math.random() * Math.PI * 2;
    creaturesInMap = new Set();
    breathCD = 0;
    releaseCD = 0;
    this.draw();
  };

  Level.prototype.releaseCreature = function() {
    if (this.enemies.length) {
      if (releaseCD) releaseCD--;
      else {
        releaseCD = 60;
        this.enemies.pop().spawn();
      }
    }
  };

  function CreatureType(maxHealth, speed) {
    this.maxHealth = maxHealth;
    this.speed = speed;
  }

  function Creature(creatureType, path) {
    this.currentHealth = creatureType.maxHealth;
    this.maxHealth = creatureType.maxHealth;
    this.speed = creatureType.speed;
  }

  Creature.prototype.spawn = function() {
    this.position = currentLevel.town;
    this.path = currentLevel.paths[Math.floor(Math.random() * currentLevel.paths.length)];
    this.nodeIndex = 0;
    this.target = this.path[0];
    this.returning = false;
    creaturesInMap.add(this);
  };

  function distance(p, q) {
    return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));
  }

  function loop() {
    function isInBreath(point) {
      function sign(p1, p2, p3) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
      }

      var v2 = new Point(position.x + 60 * Math.cos(angle + Math.PI / 6), position.y + 60 * Math.sin(angle + Math.PI / 6));
      var v3 = new Point(position.x + 60 * Math.cos(angle - Math.PI / 6), position.y + 60 * Math.sin(angle - Math.PI / 6))
      var b1 = sign(point, position, v2) < 0;
      var b2 = sign(point, v2, v3) < 0;
      var b3 = sign(point, v3, position) < 0;
      return ((b1 == b2) && (b2 == b3));
    }

    loopCtx.clearRect(0, 0, loopCanvas.width, loopCanvas.height);
    loopCtx.fillStyle = 'blue';
    for (var creature of creaturesInMap) {
      var dist = distance(creature.position, creature.target);
      if (dist < creature.speed) {
        creature.position = creature.target;
        if (creature.target === currentLevel.town) {
          creaturesInMap.delete(creature) //player loses
        } else if (creature.target === currentLevel.eggs) {
          creature.returning = true;
          creature.nodeIndex = creature.path.length - 1;
          creature.target = creature.path[creature.nodeIndex];
        } else if (creature.returning) {
          creature.nodeIndex--;
          creature.target = creature.path[creature.nodeIndex] || currentLevel.town;
        } else {
          creature.nodeIndex++;
          creature.target = creature.path[creature.nodeIndex] || currentLevel.eggs;
        }
      } else creature.position = new Point(creature.position.x + (creature.target.x - creature.position.x) * creature.speed / dist, creature.position.y + (creature.target.y - creature.position.y) * creature.speed / dist)
      loopCtx.beginPath();
      loopCtx.ellipse(creature.position.x, creature.position.y, 5, 5, 0, 0, 2 * Math.PI);
      loopCtx.fill();
    }
    if (mousePosition) angle += (Math.atan2(mousePosition.y - position.y, mousePosition.x - position.x) - angle + Math.PI * 4) % (Math.PI * 2) < Math.PI ? 0.05 : -0.05;
    angle %= Math.PI * 2;
    position = new Point(position.x + Math.cos(angle) * 4, position.y + Math.sin(angle) * 4)
    currentLevel.releaseCreature();
    loopCtx.translate(position.x, position.y);
    loopCtx.rotate(angle + Math.PI / 2);
    loopCtx.drawImage(document.getElementById('dragon-image'), -40, 0, 80, 80);
    loopCtx.rotate(-angle - Math.PI / 2);
    loopCtx.translate(-position.x, -position.y);
    if (60 < breathCD) {
      loopCtx.fillStyle = '#F88532';
      loopCtx.beginPath();
      loopCtx.moveTo(position.x, position.y);
      loopCtx.lineTo(position.x + 60 * Math.cos(angle + Math.PI / 6), position.y + 60 * Math.sin(angle + Math.PI / 6));
      loopCtx.lineTo(position.x + 60 * Math.cos(angle - Math.PI / 6), position.y + 60 * Math.sin(angle - Math.PI / 6));
      loopCtx.fill();
      for (var creature of creaturesInMap)
        if (isInBreath(creature.position)) {
          for (i = 0; i < 18; i++) {
            creature.currentHealth -= Math.floor(Math.random() / 2);
          }
          creature.currentHealth -= 1.5;
          if (creature.currentHealth <= 0) creaturesInMap.delete(creature);
        }
    }
    breathCD--;
    requestAnimationFrame(loop);
  }

  var mapCanvas = document.createElement('canvas');
  var mapCtx = mapCanvas.getContext('2d');
  var loopCanvas = document.createElement('canvas');
  var loopCtx = loopCanvas.getContext('2d');
  var bandit = new CreatureType(6, 2);
  var releaseCD;
  var breathCD;
  var creaturesInMap;
  var position;
  var mousePosition = null;
  var angle;
  var levels = [
    new Level(new Point(400, 0), [
      [
        new Point(200, 100),
        new Point(100, 150)
      ],
      [
        new Point(500, 100),
        new Point(400, 150),
        new Point(500, 550)
      ]
    ], new Point(300, 550), [new Creature(bandit), new Creature(bandit), new Creature(bandit), new Creature(bandit), new Creature(bandit), new Creature(bandit), new Creature(bandit), new Creature(bandit), new Creature(bandit), new Creature(bandit)])
  ]
  var health = 256;
  var currentLevel = levels[0];
  addEventListener('mousemove', e => mousePosition = new Point(e.clientX, e.clientY));
  addEventListener('click', () => {
    if (breathCD <= 0) breathCD = 90
  });
  mapCanvas.width = loopCanvas.width = 800;
  mapCanvas.height = loopCanvas.height = 600;
  mapCtx.lineWidth = 15;
  mapCtx.lineJoin = 'round';
  mapCtx.strokeStyle = '#28231D';
  document.body.appendChild(mapCanvas);
  document.body.appendChild(loopCanvas);
  currentLevel.init();
  requestAnimationFrame(loop);
});