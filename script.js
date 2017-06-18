addEventListener('load', () => {
  function Projectile(from, to) {
    this.speed = from.projectileSpeed;
    this.angle = Math.atan2(to.y - from.y, to.x - from.x);
    this.position = from.position;
    this.target = to;
  }

  function Point(x, y) {
    this.x = x;
    this.y = y;
  }

  function Path(nodes, to) {
    this.nodes = nodes;
    this.to = to;
  }

  function Town(position, paths, creaturesInTown, owner = 'red', hostile = false) {
    this.position = position;
    this.paths = paths;
    for (var path of paths) {
      path.from = this;
      path.to = path.to || this;
    }
    this.hostile = hostile;
    this.initialCreaturesInTown = creaturesInTown;
    this.owner = owner;
  }

  function Level(towns) {
    this.towns = towns;
  }

  Level.prototype.draw = function() {
    mapCtx.fillStyle = '#246E23';
    mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.fillStyle = '#28231D';
    mapCtx.lineWidth = 15;
    for (var town of this.towns) {
      for (var path of town.paths) {
        mapCtx.moveTo(path.from.position.x, path.from.position.y);
        for (var node of path.nodes)
          mapCtx.lineTo(node.x, node.y);
        mapCtx.lineTo(path.to.position.x, path.to.position.y);
      }
    }
    mapCtx.stroke();
    mapCtx.lineWidth = 10;
    mapCtx.strokeStyle = 'saddleBrown';
    for (var town of this.towns) {
      mapCtx.strokeRect(town.position.x - 10, town.position.y - 10, 20, 20);
    }
  };

  Level.prototype.init = function() {
    function shuffle(array) {
      var currentIndex = array.length;
      var temporaryValue;
      var randomIndex;
      // While there remain elements to shuffle...
      while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }
      return array;
    }

    dragon.position = new Point(150, 150);
    angle = Math.random() * Math.PI * 2;
    for (var town of this.towns) {
      town.creaturesInTown = [];
      for (var type of town.initialCreaturesInTown)
        for (var i = 0; i < type[1]; i++) town.creaturesInTown.push(new Creature(type[0]));
      shuffle(town.creaturesInTown);
    }
    creaturesInMap = new Set();
    breathCD = 0;
    releaseCD = 0;
    this.draw();
  };

  Level.prototype.releaseCreature = function() {
    var hostileTowns = [];
    for (var town of currentLevel.towns) {
      if (town.hostile) hostileTowns.push(town);
    }
    town = hostileTowns[Math.floor(Math.random() * hostileTowns.length)];
    if (town && town.creaturesInTown.length) {
      if (releaseCD) releaseCD--;
      else {
        releaseCD = 60;
        town.creaturesInTown.pop().spawn(town);
      }
    }
  };

  function CreatureType(maxHealth, speed, damage = 0, range = 0) {
    this.maxHealth = maxHealth;
    this.speed = speed;
    this.damage = damage;
    this.range = range;
  }

  function Creature(creatureType, path, radius = 5) {
    this.currentHealth = creatureType.maxHealth;
    this.maxHealth = creatureType.maxHealth;
    this.speed = creatureType.speed;
    this.bottom = radius;
    this.left = radius;
    this.right = radius;
    this.top = radius;
    this.radius = radius;
  }

  Creature.prototype.spawn = function(town) {
    this.position = town.position;
    this.path = town.paths[Math.floor(Math.random() * town.paths.length)];
    this.nodeIndex = 0;
    this.target = this.path.nodes[0];
    creaturesInMap.add(this);
  };

  Creature.prototype.attack = function(creature) {
    if (this.attack) {
      if (this.CD <= 0 && dist(creature.position, this.position) < this.range) {
        projectiles.push(new Projectiles(this, creature));
        this.CD = this.maxCD;
      }
      this.CD--;
    }
  }

  function distance(p, q) {
    return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));
  }

  function loop() {
    function isInBreath(point) {
      function sign(p1, p2, p3) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
      }

      var v2 = new Point(dragon.position.x + 60 * Math.cos(angle + Math.PI / 6), dragon.position.y + 60 * Math.sin(angle + Math.PI / 6));
      var v3 = new Point(dragon.position.x + 60 * Math.cos(angle - Math.PI / 6), dragon.position.y + 60 * Math.sin(angle - Math.PI / 6));
      var b1 = sign(point, dragon.position, v2) < 0;
      var b2 = sign(point, v2, v3) < 0;
      var b3 = sign(point, v3, dragon.position) < 0;
      return ((b1 == b2) && (b2 == b3));
    }

    function createBar(creature, current, max, color, offset = 0) {
      loopCtx.fillStyle = 'black';
      loopCtx.fillRect(creature.position.x - creature.left + offset, creature.position.y + creature.bottom, creature.right + creature.left, 3);
      loopCtx.fillStyle = color;
      loopCtx.fillRect(creature.position.x - creature.left + offset, creature.position.y + creature.bottom, (creature.right + creature.left) * current / max, 3);
    }

    //clear the loop canvas
    loopCtx.clearRect(0, 0, loopCanvas.width, loopCanvas.height);
    //move and draw the creatures
    for (var creature of creaturesInMap) {
      var dist = distance(creature.position, creature.target);
      if (dist < creature.speed) {
        creature.position = creature.target;
        if (creature.target === creature.path.to.position) {
          //TODO: modify this
          creaturesInMap.delete(creature);
          creature.path.to.creaturesInTown.push(creature);
        } else {
          creature.nodeIndex++;
          creature.target = creature.path.nodes[creature.nodeIndex] || creature.path.to.position;
        }
      } else creature.position = new Point(creature.position.x + (creature.target.x - creature.position.x) * creature.speed / dist, creature.position.y + (creature.target.y - creature.position.y) * creature.speed / dist)
      loopCtx.fillStyle = 'blue';
      loopCtx.beginPath();
      loopCtx.ellipse(creature.position.x, creature.position.y, creature.radius, creature.radius, 0, 0, 2 * Math.PI);
      loopCtx.fill();
      if (creature.currentHealth < creature.maxHealth) createBar(creature, creature.currentHealth, creature.maxHealth, 'lime');
    }
    if (mousePosition) {
      var mouseAngle = Math.atan2(mousePosition.y - dragon.position.y, mousePosition.x - dragon.position.x);
      var angleDifference = (mouseAngle - angle + Math.PI * 4) % (Math.PI * 2);
      if (angleDifference <= 0.05 || 2 * Math.PI - 0.05 <= angleDifference) {
        angle = mouseAngle;
      } else angle += (mouseAngle - angle + Math.PI * 4) % (Math.PI * 2) < Math.PI ? 0.05 : -0.05;
    }
    angle = (angle + Math.PI * 2) % (Math.PI * 2);
    dragon.position = new Point(dragon.position.x + Math.cos(angle) * 2, dragon.position.y + Math.sin(angle) * 2)
    loopCtx.translate(dragon.position.x, dragon.position.y);
    loopCtx.rotate(angle + Math.PI / 2);
    loopCtx.drawImage(document.getElementById('dragon-image'), -40, 0, 80, 80);
    loopCtx.rotate(-angle - Math.PI / 2);
    loopCtx.translate(-dragon.position.x, -dragon.position.y);
    if (60 < breathCD) {
      loopCtx.fillStyle = '#F88532';
      loopCtx.beginPath();
      for (var i = 0; i < 60; i++) {
        var dist = Math.random() * 60;
        var alpha = Math.random() * Math.PI / 3 - Math.PI / 6;
        loopCtx.ellipse(dragon.position.x + dist * Math.cos(angle - alpha), dragon.position.y + dist * Math.sin(angle - alpha), 3, 3, 0, 0, 2 * Math.PI);
      }
      loopCtx.fill();
      for (var creature of creaturesInMap)
        if (isInBreath(creature.position)) {
          for (i = 0; i < 18; i++) {
            creature.currentHealth -= Math.floor(Math.random() / 2);
          }
          creature.currentHealth -= 1.5;
          if (creature.currentHealth <= 0) creaturesInMap.delete(creature);
        }
      for (var town of currentLevel.towns)
        if (isInBreath(town.position))
          town.hostile = true;
    }
    breathCD--;
    if (0 < breathCD) {
      createBar(dragon, 90 - breathCD, 90, '#F88532', -40 * Math.cos(angle));
    }
    currentLevel.releaseCreature();
    dragon.health++;
    //temp highscore
    enemiesLeft = creaturesInMap.size;
    for (var town of currentLevel.towns) enemiesLeft += town.creaturesInTown.length;
    if (enemiesLeft) frame++;
    else {
      loopCtx.fillStyle = 'white';
      loopCtx.fillText('You killed them all in ' + (frame / 60).toFixed(2) + ' seconds.', 8, 38);
    }
    requestAnimationFrame(loop);
  }

  var mapCanvas = document.createElement('canvas');
  var mapCtx = mapCanvas.getContext('2d');
  var loopCanvas = document.createElement('canvas');
  var loopCtx = loopCanvas.getContext('2d');
  var rogue = new CreatureType(12, 1.1);
  var releaseCD;
  var breathCD;
  var creaturesInMap;
  var frame = 0;
  var dragon = {
    health: 256,
    top: 0,
    bottom: 80,
    left: 40,
    right: 40
  };
  var mousePosition = null;
  var angle;
  var levels = [
    new Level(
      [
        new Town(
          new Point(400, 300), [
            new Path([
              new Point(200, 450),
              new Point(100, 400),
              new Point(150, 300),
              new Point(400, 150),
              new Point(650, 300),
              new Point(700, 400),
              new Point(600, 450)
            ]),
            new Path([

              new Point(600, 450),
              new Point(700, 400),
              new Point(500, 300),
              new Point(400, 150),
              new Point(300, 300),
              new Point(100, 400),
              new Point(200, 450)
            ])
          ],
          new Map(
            [
              [rogue, 10]
            ]
          )
        )
      ]
    )
  ];
  var currentLevel = levels[0];
  addEventListener('mousemove', e => mousePosition = new Point(e.clientX, e.clientY));
  addEventListener('mousedown', () => {
    if (breathCD <= 0) breathCD = 90
  });
  mapCanvas.width = loopCanvas.width = 800;
  mapCanvas.height = loopCanvas.height = 600;
  mapCtx.lineJoin = 'round';
  mapCtx.strokeStyle = '#28231D';
  loopCtx.font = '20px Arial';
  document.body.appendChild(mapCanvas);
  document.body.appendChild(loopCanvas);
  currentLevel.init();
  requestAnimationFrame(loop);
});