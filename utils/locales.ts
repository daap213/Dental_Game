
import { Language } from '../types';

export const TEXT = {
    en: {
        menu: {
            subtitle: "Plaque Attack",
            briefing_label: "MISSION BRIEFING",
            loading: "Loading Mission...",
            select_aim: "Aiming Style",
            mouse_aim: "MOUSE AIM",
            keyboard_aim: "KEYBOARD",
            select_loadout: "Select Loadout",
            loadout_all: "Enemies drop all weapon types.",
            loadout_specific: "Only selected weapon upgrades drop.",
            select_difficulty: "Select Difficulty",
            diff_easy: "EASY",
            diff_normal: "NORMAL",
            diff_hard: "HARD",
            diff_legend: "LEGEND",
            btn_knowledge: "DATABASE",
            btn_start: "START OPERATION",
            btn_credits: "CREDITS",
            controls: "CONTROLS",
            ctrl_move: "Move",
            ctrl_aim: "Aim Up",
            ctrl_jump: "Jump (x2)",
            ctrl_shoot: "Shoot",
            ctrl_dash: "Dash"
        },
        database: {
            title: "TACTICAL KNOWLEDGE",
            achievements_title: "ACHIEVEMENTS & TRIGGERS",
            achievements_desc: "Complete objectives to trigger Perk selection.",
            ach_score_title: "High Score",
            ach_score_desc: "6,200 pts, then every 8,000 pts.",
            ach_kill_title: "Exterminator",
            ach_kill_desc: "20 kills, then 30, 50, 80... (+10 progressive).",
            ach_boss_title: "Giant Slayer",
            ach_boss_desc: "Defeat any Stage Boss.",
            rewards_title: "AVAILABLE UPGRADES (PERKS)",
            arsenal_title: "ARSENAL (Level Up Max 3)",
            bosses_title: "MOST WANTED (Bosses)",
            enemies_title: "COMMON THREATS",
            close: "CLOSE"
        },
        hud: {
            vitals: "VITALS",
            shield_active: "SHIELD ACTIVE",
            stage: "STAGE",
            score: "SCORE",
            lvl: "LVL",
            slow: "SLOW"
        },
        pause: {
            title: "PAUSED",
            resume: "RESUME",
            restart: "RESTART",
            quit: "QUIT TO MENU"
        },
        gameover: {
            title: "GAME OVER",
            subtitle: "The Cavities Won...",
            try_again: "TRY AGAIN",
            menu: "MAIN MENU"
        },
        perks: {
            title: "LEVEL UP!",
            subtitle: "CHOOSE AN UPGRADE"
        },
        credits: {
            title: "CREDITS",
            back: "BACK",
            dev_role: "Lead Developer (AI)",
            creator_role: "Created By",
            tester_role: "Tester & Ideas",
            dedication_title: "Special Dedication",
            dedication_quote: "\"My favorite dentist.\"",
            footer: "Super Molar: Plaque Attack ©"
        },
        // Static Data
        weapons: {
            normal: { name: "Normal", desc: "Standard issue dental drill. Reliable." },
            spread: { name: "Spread", desc: "Shotgun spray. Good for crowds." },
            laser: { name: "Laser", desc: "High-tech curing light. Pierces enemies." },
            mouthwash: { name: "Wave", desc: "Wave launcher. Pierces walls & foes." },
            floss: { name: "Floss", desc: "Melee Whip. High damage, short range." },
            toothbrush: { name: "Brush", desc: "Heavy Sword. Huge arc, deflects." }
        },
        perk_names: {
            enamel_shield: { name: "Enamel Shield", desc: "Grants +25 Max Shield (Toothpaste Barrier)." },
            vitality_root: { name: "Vitality Root", desc: "Increases Max HP by +20 and heals you." },
            extra_filling: { name: "Extra Filling", desc: "Fully restores Health and Shield." },
            fluoride_rush: { name: "Fluoride Rush", desc: "Increases Movement Speed by 10%." },
            aerodynamic_floss: { name: "Aerodynamic Floss", desc: "Reduces Dash Cooldown by 15%." },
            bristle_rage: { name: "Bristle Rage", desc: "Increases Damage dealt by 15%." },
            thick_enamel: { name: "Thick Enamel", desc: "Take 15% less damage from all sources." },
            extra_dash: { name: "Dual Motion", desc: "Gain +1 Max Consecutive Dash." },
            temp_immunity: { name: "Fluoride Bath", desc: "Become invincible for 3 seconds now." },
            extra_life: { name: "Crown Implant", desc: "+1 Extra Life. Revive on death." }
        },
        bosses: {
            king: "The Cavity King",
            phantom: "Plaque Phantom",
            tank: "Tartar Tank",
            general: "General Gingivitis",
            deity: "The Decay Deity"
        },
        boss_desc: {
            king: "Jumps and slams. Watch out for shockwaves.",
            phantom: "Teleports and dashes. Hard to hit.",
            tank: "Heavily armored. Fires mortar shells.",
            general: "Summons minions and fires giant lasers.",
            deity: "Bullet hell nightmare. Good luck."
        },
        enemy_names: {
            bacteria: "Bacteria",
            plaque: "Plaque Monster",
            bomber: "Candy Bomber",
            turret: "Tartar Turret",
            rusher: "Sugar Rusher",
            fiend: "Sugar Fiend",
            spitter: "Acid Spitter",
            grunt: "Gingivitis Grunt"
        },
        enemy_desc: {
            bacteria: "Green germs. They jump.",
            plaque: "Orange sludge. Durable.",
            bomber: "Drops explosives from above.",
            turret: "Stationary shooter.",
            rusher: "Very fast, jumps high.",
            fiend: "Leaves sticky slowing trails.",
            spitter: "Lobs corrosive blobs.",
            grunt: "Armored. Charges at you."
        }
    },
    es: {
        menu: {
            subtitle: "Ataque de Placa",
            briefing_label: "MISIÓN (IA)",
            loading: "Cargando Misión...",
            select_aim: "Estilo de Apuntado",
            mouse_aim: "MOUSE (RATÓN)",
            keyboard_aim: "TECLADO SOLO",
            select_loadout: "Seleccionar Equipo",
            loadout_all: "Enemigos sueltan cualquier arma.",
            loadout_specific: "Solo mejoras del arma elegida.",
            select_difficulty: "Seleccionar Dificultad",
            diff_easy: "FÁCIL",
            diff_normal: "NORMAL",
            diff_hard: "DIFÍCIL",
            diff_legend: "LEYENDA",
            btn_knowledge: "CONOCIMIENTO",
            btn_start: "INICIAR OPERACIÓN",
            btn_credits: "CRÉDITOS",
            controls: "CONTROLES",
            ctrl_move: "Mover",
            ctrl_aim: "Apuntar Arriba",
            ctrl_jump: "Saltar (x2)",
            ctrl_shoot: "Disparar",
            ctrl_dash: "Impulso/Dash"
        },
        database: {
            title: "CONOCIMIENTO TÁCTICO",
            achievements_title: "LOGROS Y DETONANTES",
            achievements_desc: "Completa objetivos para activar selección de Mejoras.",
            ach_score_title: "Puntuación Alta",
            ach_score_desc: "6,200 pts, luego cada 8,000 pts.",
            ach_kill_title: "Exterminador",
            ach_kill_desc: "20 bajas, luego 30, 50, 80... (+10 progresivo).",
            ach_boss_title: "Matagigantes",
            ach_boss_desc: "Derrota a cualquier Jefe de Fase.",
            rewards_title: "MEJORAS DISPONIBLES (PERKS)",
            arsenal_title: "ARSENAL (Nivel Max 3)",
            bosses_title: "LOS MÁS BUSCADOS (Jefes)",
            enemies_title: "AMENAZAS COMUNES",
            close: "CERRAR"
        },
        hud: {
            vitals: "SIGNOS",
            shield_active: "ESCUDO ACTIVO",
            stage: "FASE",
            score: "PUNTAJE",
            lvl: "NVL",
            slow: "LENTO"
        },
        pause: {
            title: "PAUSA",
            resume: "CONTINUAR",
            restart: "REINICIAR",
            quit: "SALIR AL MENÚ"
        },
        gameover: {
            title: "JUEGO TERMINADO",
            subtitle: "Las Caries ganaron...",
            try_again: "REINTENTAR",
            menu: "MENÚ PRINCIPAL"
        },
        perks: {
            title: "¡SUBIDA DE NIVEL!",
            subtitle: "ELIGE UNA MEJORA"
        },
        credits: {
            title: "CRÉDITOS",
            back: "VOLVER",
            dev_role: "Desarrollador Líder (IA)",
            creator_role: "Creado Por",
            tester_role: "Tester e Ideas",
            dedication_title: "Dedicatoria Especial",
            dedication_quote: "\"Mi odontóloga favorita.\"",
            footer: "Super Molar: Plaque Attack ©"
        },
        // Static Data
        weapons: {
            normal: { name: "Normal", desc: "Taladro dental estándar. Confiable." },
            spread: { name: "Spread", desc: "Disparo de escopeta. Bueno para grupos." },
            laser: { name: "Láser", desc: "Luz de curado. Perfora enemigos." },
            mouthwash: { name: "Enjuague", desc: "Lanzador de ondas. Atraviesa muros." },
            floss: { name: "Hilo", desc: "Látigo Melee. Alto daño, corto alcance." },
            toothbrush: { name: "Cepillo", desc: "Espada Pesada. Gran arco, desvía." }
        },
        perk_names: {
            enamel_shield: { name: "Escudo de Esmalte", desc: "Otorga +25 Escudo Máximo (Barrera)." },
            vitality_root: { name: "Raíz Vital", desc: "+20 Salud Máxima y te cura." },
            extra_filling: { name: "Relleno Extra", desc: "Restaura completamente Salud y Escudo." },
            fluoride_rush: { name: "Subidón de Flúor", desc: "+10% Velocidad de Movimiento." },
            aerodynamic_floss: { name: "Hilo Aerodinámico", desc: "Reduce 15% el tiempo recarga de Dash." },
            bristle_rage: { name: "Furia de Cerda", desc: "+15% Daño infligido." },
            thick_enamel: { name: "Esmalte Grueso", desc: "Recibe 15% menos de daño." },
            extra_dash: { name: "Movimiento Dual", desc: "Gana +1 Dash consecutivo." },
            temp_immunity: { name: "Baño de Flúor", desc: "Invencible por 3 segundos ahora." },
            extra_life: { name: "Implante de Corona", desc: "+1 Vida Extra. Revivir al morir." }
        },
        bosses: {
            king: "El Rey Caries",
            phantom: "Fantasma de Placa",
            tank: "Tanque de Sarro",
            general: "General Gingivitis",
            deity: "Deidad del Deterioro"
        },
        boss_desc: {
            king: "Salta y aplasta. Cuidado con las ondas.",
            phantom: "Se teletransporta y embiste. Difícil de dar.",
            tank: "Fuertemente blindado. Dispara morteros.",
            general: "Invoca esbirros y dispara láseres gigantes.",
            deity: "Pesadilla Bullet Hell. Buena suerte."
        },
        enemy_names: {
            bacteria: "Bacteria",
            plaque: "Monstruo de Placa",
            bomber: "Bombardero",
            turret: "Torreta de Sarro",
            rusher: "Corredor de Azúcar",
            fiend: "Demonio de Azúcar",
            spitter: "Escupidor de Ácido",
            grunt: "Soldado Gingivitis"
        },
        enemy_desc: {
            bacteria: "Gérmenes verdes. Saltan.",
            plaque: "Lodo naranja. Resistente.",
            bomber: "Deja caer explosivos.",
            turret: "Disparador estático.",
            rusher: "Muy rápido, salta alto.",
            fiend: "Deja rastros pegajosos.",
            spitter: "Lanza globos corrosivos.",
            grunt: "Blindado. Te embiste."
        }
    }
};
