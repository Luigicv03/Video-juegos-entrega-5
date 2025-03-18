import { createAnimations } from "./animations.js";

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.image('cloud1', 'assets/scenery/overworld/cloud1.png');
        this.load.image('floorbricks', 'assets/scenery/overworld/floorbricks.png');
        this.load.spritesheet('mario', 'assets/entities/mario.png', { 
            frameWidth: 18, 
            frameHeight: 16 
        });
        this.load.audio('gameover', 'assets/sound/effects/gameover.mp3');
        this.load.spritesheet('goomba', 'assets/entities/overworld/goomba.png', { 
            frameWidth: 16, 
            frameHeight: 16 
        });
        this.load.image('block', 'assets/blocks/overworld/block.png');
        this.load.spritesheet('coin', 'assets/collectibles/coin.png', { 
            frameWidth: 16, 
            frameHeight: 16 
        });
        this.load.image('flag', 'assets/scenery/final-flag.png');
        this.load.image('flagpole', 'assets/scenery/flag-mast.png');
        this.load.audio('coin', 'assets/sound/effects/coin.mp3');
        this.load.audio('win', 'assets/sound/effects/cursed-here-we-go.mp3');
        this.load.audio('deleteenemy', 'assets/sound/effects/goomba-stomp.wav');

    }

    create() {

        // Configuración inicial
        this.add.image(100, 50, 'cloud1')
            .setOrigin(0, 0)
            .setScale(0.15);

        // 1. Suelo principal
        this.floor = this.physics.add.staticGroup();
        [0, 150, 300, 450, 600,700].forEach(x => {
            this.floor.create(x, config.height - 16, 'floorbricks')
                .setOrigin(0, 0.5)
                .setSize(32, 16, false)
                .refreshBody();
        });

        // 2. Bloques interactivos
        this.blocks = this.physics.add.staticGroup();
        // Bloque normal con moneda
        this.blocks.create(200, 150, 'block')
            .setOrigin(0, 0.5)
            .setSize(16, 16)
            .refreshBody()
            .setData({ type: 'normal', used: false });

        this.blocks.create(217, 150, 'block')
            .setOrigin(0, 0.5)
            .setSize(16, 16)
            .refreshBody()
            .setData({ type: 'normal', used: false });

        this.blocks.create(350, 150, 'block')
            .setOrigin(0, 0.5)
            .setSize(16, 16)
            .refreshBody()
            .setData({ type: 'normal', used: false });

        this.blocks.create(367, 150, 'block')
            .setOrigin(0, 0.5)
            .setSize(16, 16)
            .refreshBody()
            .setData({ type: 'normal', used: false });

        // 3. Mario
        this.mario = this.physics.add.sprite(50, 80, 'mario')
            .setOrigin(0.5, 1)
            .setGravityY(300)
            .setCollideWorldBounds(true)
            .setSize(14, 14)
            .setOffset(2, 2);

        // 4. Enemigos
        this.enemies = this.physics.add.group();
        this.spawnGoomba(200, 60);
        this.spawnGoomba(400, 60);

        // 5. Monedas
        this.coinGroup = this.physics.add.group();
        this.coins = 0;

        // 6. Bandera final
        this.flagpole = this.physics.add.staticSprite(740, config.height - 30, 'flagpole')
            .setOrigin(0.5, 1);
        this.flag = this.physics.add.staticSprite(733, 75, 'flag')
            .setOrigin(0.5, 1);

        // Configuración de colisiones
        this.physics.add.collider(this.mario, this.enemies, this.hitEnemy, null, this);
        this.physics.add.collider(this.enemies, this.floor); // Goombas colisionan con el suelo
        this.physics.add.collider(this.mario, this.floor); // Mario colisiona con el suelo
        this.physics.add.collider(this.mario, this.blocks, this.hitBlock, null, this); // Mario colisiona con bloques
        this.physics.add.collider(this.mario, this.enemies, this.hitEnemy, null, this); // Mario colisiona con Goombas
        this.physics.add.overlap(this.mario, this.coinGroup, this.collectCoin, null, this); // Mario recoge monedas
        this.physics.add.overlap(this.mario, this.flagpole, this.finishLevel, null, this); // Mario llega a la bandera

        // 7. Cámara y mundo
        this.physics.world.setBounds(0, 0, 2000, config.height);
        this.cameras.main.setBounds(0, 0, 2000, config.height)
            .startFollow(this.mario);

        // 8. Controles y animaciones
        createAnimations(this);
        this.keys = this.input.keyboard.createCursorKeys();
    }

    update() {
        if (this.mario.isDead) return;

        // Movimiento horizontal
        if (this.keys.left.isDown) {
            this.mario.setVelocityX(-160).setFlipX(true);
            this.mario.anims.play('mario-walk', true);
        } 
        else if (this.keys.right.isDown) {
            this.mario.setVelocityX(160).setFlipX(false);
            this.mario.anims.play('mario-walk', true);
        } 
        else {
            this.mario.setVelocityX(0);
            this.mario.anims.play('mario-idle', true);
        }

        // Salto
        if (this.keys.up.isDown && this.mario.body.blocked.down) {
            this.mario.setVelocityY(-300);
            this.mario.anims.play('mario-jump', true);
        }

        // Muerte por colisión con el fondo del mundo
        if (this.mario.body.blocked.down && this.mario.y >= config.height - 16) {
            this.handleDeath();
        }
    }

    spawnGoomba(x, y) {
        const goomba = this.enemies.create(x, y, 'goomba')
            .setGravityY(300)
            .setVelocityX(-50)
            .setSize(14, 12)
            .setOffset(1, 4)
            .setBounce(1, 0);  // Rebote horizontal

        // IA con detección de bordes
        goomba.prevX = x;
        this.time.addEvent({
            delay: 100,
            callback: () => {
                if (!goomba.active) return;
                
                // Detectar si está atascado o sin movimiento horizontal
                if (Math.abs(goomba.body.velocity.x) < 1) {
                    goomba.setVelocityX(-goomba.body.velocity.x);
                    goomba.flipX = !goomba.flipX;
                }
                
                // Detectar caída inminente
                const nextX = goomba.x + (goomba.body.velocity.x > 0 ? 16 : -16);
                const platformBelow = this.floor.getChildren().some(platform => 
                    platform.y === goomba.y + 16 && 
                    nextX >= platform.x && 
                    nextX <= platform.x + platform.width
                );
                
                if (!platformBelow) {
                    goomba.setVelocityX(-goomba.body.velocity.x);
                    goomba.flipX = !goomba.flipX;
                }
            },
            loop: true
        });

        goomba.anims.play('goomba-walk', true);
    }

    handleDeath() {
      this.mario.isDead = true;
      this.mario.setFrame(4); // <-- Frame 5 para la muerte
      this.mario.setCollideWorldBounds(false);
      this.sound.play('gameover', { volume: 0.2 });
      
      this.time.delayedCall(100, () => this.mario.setVelocityY(-350));
      this.time.delayedCall(2000, () => this.scene.restart());
  }
  
  hitEnemy(mario, goomba) {
    // Si Mario toca al Goomba desde arriba
    if (mario.body.velocity.y > 0 && mario.body.touching.down) {
        // Eliminar al Goomba inmediatamente
        goomba.destroy();
        // Dar un pequeño impulso a Mario hacia arriba
        mario.setVelocityY(-150);
        this.sound.play('deleteenemy', { volume: 0.2 });

    }
    // Si Mario toca al Goomba desde los lados
    else if (mario.body.touching.left || mario.body.touching.right) {
        // Mario muere (usar frame 5)
        this.mario.setFrame(4); // <-- Frame 5 para la muerte
        this.handleDeath();
    }
}

    hitBlock(mario, block) {
        if (block.getData('used')) return;

        if (mario.body.touching.up) {
            block.setData('used', true);
            
            if (block.getData('type') === 'normal') {
                this.coinGroup.create(block.x + 8, block.y - 20, 'coin', 0)
                    .setGravityY(-300)
                    .setVelocityY(-100)
                    .setScale(0.8);
                this.sound.play('coin', { volume: 0.2 });
                this.coins++;
            }

            if (block.visible) {
                this.tweens.add({
                    targets: block,
                    y: block.y - 5,
                    duration: 100,
                    yoyo: true
                });
            }
        }
    }

    collectCoin(mario, coin) {
        coin.destroy();
        this.coins++;
    }

    finishLevel() {
        this.cameras.main.fadeOut(1000);
        this.time.delayedCall(1500, () => this.scene.restart());
        this.sound.play('win', { volume: 0.2 });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 256,
    height: 244,
    backgroundColor: '#049cd8',
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: MainScene
};

new Phaser.Game(config);
