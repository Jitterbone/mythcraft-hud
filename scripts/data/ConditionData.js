const MODE_ADD = globalThis.CONST?.ACTIVE_EFFECT_CHANGE_TYPES ? "add" : 2;
const MODE_OVERRIDE = globalThis.CONST?.ACTIVE_EFFECT_CHANGE_TYPES ? "override" : 5;
const MODE_MULTIPLY = globalThis.CONST?.ACTIVE_EFFECT_CHANGE_TYPES ? "multiply" : 1;

export const mcConditions = [
  {
    id: 'absorb',
    label: 'Absorb',
    img: 'modules/mythcraft-hud/icons/conditions/absorb.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/absorb.svg',
    description: 'When a creature has Absorb X they reduce the amount of damage taken by X amount when it is that type of damage. For example, a hero with Absorb Fire 5 reduces all fire damage taken by 5.',
    changes: [],
    flags: { "mythcraft-hud": { "absorb": true } }
  },
  {
    id: 'affinity',
    label: 'Affinity',
    img: 'modules/mythcraft-hud/icons/conditions/affinity.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/affinity.svg',
    description: 'When you have an Affinity with a type of damage, you take 1⁄2 of that type of damage, and deal +3 damage whenever you deal that type of damage.',
    changes: [],
    flags: { "mythcraft-hud": { "affinity": true } }
  },
  {
    id: 'bleeding',
    label: 'Bleeding',
    img: 'modules/mythcraft-hud/icons/conditions/bleeding.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/bleeding.svg',
    description: 'A creature suffers Bleeding at the end of each of their turns, taking the amount of physical damage specified. This might be a set number or a die roll, such as Bleeding (1d4). The effect is ended by receiving any amount of magical healing, Catching your Breath, or by receiving a successful INT/ Medicine check.',
    changes: [],
    flags: { "mythcraft-hud": { "bleeding": true } }
  },
  {
    id: 'blinded',
    label: 'Blinded',
    img: 'modules/mythcraft-hud/icons/conditions/blinded.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/blinded.svg',
    description: 'You cannot see or gain any benefits from any ability requiring sight. All creatures are Unseen.',
    changes: [],
    flags: { "mythcraft-hud": { "blinded": true } }
  },
  {
    id: 'bloodied',
    label: 'Bloodied',
    img: 'modules/mythcraft-hud/icons/conditions/bloodied.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/bloodied.svg',
    description: 'You gain the Bloodied condition when you have equal to or less than 1⁄2 your max HP.',
    changes: [],
    flags: { "mythcraft-hud": { "bloodied": true } }
  },
  {
    id: 'broken',
    label: 'Broken',
    img: 'modules/mythcraft-hud/icons/conditions/broken.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/broken.svg',
    description: 'You are Frightened and Shaken. You must use all available movement to retreat from perceived danger.',
    changes: [],
    flags: { "mythcraft-hud": { "broken": true } }
  },
  {
    id: 'burning',
    label: 'Burning',
    img: 'modules/mythcraft-hud/icons/conditions/burning.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/burning.svg',
    description: 'A creature suffers Burning at the end of each of their turns, taking the amount of fire damage specified. This might be a set number or a die roll, such as Burning (1d4). The effect is ended by being doused in water or by rolling in dirt or mud by falling Prone and spending 3 AP.',
    changes: [],
    flags: { "mythcraft-hud": { "burning": true } }
  },
  {
    id: 'charmed',
    label: 'Charmed',
    img: 'modules/mythcraft-hud/icons/conditions/charmed.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/charmed.svg',
    description: 'You look upon the creature that Charmed you as a friendly acquaintance. You will not intentionally harm the creature that Charmed you. When that creature targets your ANT, LOG, or WILL, they get +1 TA. When that creature makes an INT or CHA check to interact with you, they roll 2d20 and take the higher result. Unless stated otherwise, you know you were Charmed after this condition fades.',
    changes: [],
    flags: { "mythcraft-hud": { "charmed": true } }
  },
  {
    id: 'chilled',
    label: 'Chilled',
    img: 'modules/mythcraft-hud/icons/conditions/chilled.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/chilled.svg',
    description: 'Moving and making weapon attacks cost 1 more AP than they would normally. A creature that uses creature actions can take one fewer actions than it normally would (min 1).',
    changes: [],
    flags: { "mythcraft-hud": { "chilled": true } }
  },
  {
    id: 'concealed',
    label: 'Concealed',
    img: 'modules/mythcraft-hud/icons/conditions/concealed.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/concealed.svg',
    description: 'You are Concealed when you are not completely hidden, but Line of Sight is interrupted by fog, smoke, foliage, or other obscuring phenomena. Creatures are aware of exactly where you are but cannot see you clearly. While Concealed, you have +1 TA on attacks provided that you can see your enemy clearly, and attacks against you suffer 1 TD.',
    changes: [
      { key: 'system.bonuses.ta', mode: MODE_ADD, value: "1" },
      { key: 'system.bonuses.td.all', mode: MODE_ADD, value: "1" }
    ],
  },
  {
    id: 'cover',
    label: 'Cover',
    img: 'modules/mythcraft-hud/icons/conditions/cover.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/cover.svg',
    description: 'If at least 1⁄2 of your body is protected by an object that would block physical damage, then you have Partial Cover. Your AR and physical defenses gain between +1 and +3 against ranged attacks, determined by your MC and the amount of cover you have. When you have Total Cover, you cannot be targeted by ranged attacks or any effect that requires Line of Sight to you.',
    changes: [
        { key: 'system.defenses.ar', mode: MODE_ADD, value: "1" },
        { key: 'system.defenses.ref', mode: MODE_ADD, value: "1" },
        { key: 'system.defenses.fort', mode: MODE_ADD, value: "1" }
    ]
  },
  {
    id: 'dazed',
    label: 'Dazed',
    img: 'modules/mythcraft-hud/icons/conditions/dazed.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/dazed.svg',
    description: 'Your current AP is reduced to 3, unless it was already 3 or lower. You gain no more than 3 AP at the start of your turns while Dazed and cannot use Reactive AP or carry over AP from previous rounds. A creature that uses creature actions has their maximum number of actions reduced to 2, unless it was already 2 or lower. It cannot take reactions.',
    changes: [],
    flags: { "mythcraft-hud": { "dazed": true } }
  },
  {
    id: 'deafened',
    label: 'Deafened',
    img: 'modules/mythcraft-hud/icons/conditions/deafened.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/deafened.svg',
    description: 'You cannot hear and are Immune to effects that require hearing. You automatically fail any roll that requires you to be able to hear. Casting a magic that requires verbal input requires you roll 2d20 and take the lower result.',
    changes: [],
    flags: { "mythcraft-hud": { "deafened": true } }
  },
  {
    id: 'demoralized',
    label: 'Demoralized',
    img: 'modules/mythcraft-hud/icons/conditions/demoralized.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/demoralized.svg',
    description: 'All attacks against a Demoralized creature gain +1 TA.',
    changes: [],
    flags: { "mythcraft-hud": { "demoralized": true } }
  },
  {
    id: 'engaged',
    label: 'Engaged',
    img: 'modules/mythcraft-hud/icons/conditions/engaged.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/engaged.svg',
    description: 'A target that is Engaged provokes a 0 AP reactive attack when it leaves the reach of the creature that has Engaged it. If the attack hits, the creature takes damage as normal and its speed is reduced to 0 until the start of its next turn.',
    changes: [],
    flags: { "mythcraft-hud": { "engaged": true } }
  },
  {
    id: 'enthralled',
    label: 'Enthralled',
    img: 'modules/mythcraft-hud/icons/conditions/enthralled.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/enthralled.svg',
    description: 'You are Charmed and lose your sense of self, following the instructions from the creature that Enthralled you even to the point of putting yourself in danger. You will not intentionally harm the creature that Enthralled you, but will not undertake actions that will obviously lead to your death. For example, you may attack your ally, but would not fall on your own sword. When the creature that Enthralled you attacks your ANT, LOG, or WILL, or makes a check against you using its INT or CHA, it rolls 2d20 and takes the higher.',
    changes: [],
    flags: { "mythcraft-hud": { "enthralled": true } }
  },
  {
    id: 'fatigued',
    label: 'Fatigued',
    img: 'modules/mythcraft-hud/icons/conditions/fatigued.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/fatigued.svg',
    description: 'Whenever you gain Fatigue, immediately gain +1 Death Point and become Fatigued (you gain +1 Death Point each time you gain Fatigue, even if you were already Fatigued). While Fatigued, you do not remove your Death Points when you Recoup or Take a Rest. Instead, when you Take a Rest, you remove the Fatigued condition if you eat and drink the minimum amount needed to sustain you.',
    changes: [
      { key: 'system.death.value', mode: MODE_ADD, value: "1" }
    ],
    flags: { "mythcraft-hud": { "fatigued": true } }
  },
  {
    id: 'flanking',
    label: 'Flanking',
    img: 'modules/mythcraft-hud/icons/conditions/flanking.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/flanking.svg',
    description: 'The Flanking condition is achieved when two friendly targets threaten a border or corner opposite of one another. You are only considered to threaten a square if you are able to melee attack that square. A Prone creature can flank, for example, but an Unconscious one cannot. If you are Flanking, you gain +1 TA against the creature you are Flanking.',
    changes: [
      { key: 'system.bonuses.ta', mode: MODE_ADD, value: "1" }
    ]
  },
  {
    id: 'focused',
    label: 'Focused',
    img: 'modules/mythcraft-hud/icons/conditions/focused.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/focused.svg',
    description: 'You gain +1 TA against a specific target. When you gain this condition, it will specify which target you gain TA against.',
    changes: [],
    flags: { "mythcraft-hud": { "focused": true } }
  },
  {
    id: 'frightened',
    label: 'Frightened',
    img: 'modules/mythcraft-hud/icons/conditions/frightened.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/frightened.svg',
    description: 'You suffer 1 TD while the source of fear is in sight, and cannot willingly move closer to the source of your fear.',
    changes: [
      { key: 'system.bonuses.td.all', mode: MODE_ADD, value: "1" }
    ],
    flags: { "mythcraft-hud": { "frightened": true } }
  },
  {
    id: 'grappled',
    label: 'Grappled',
    img: 'modules/mythcraft-hud/icons/conditions/grappled.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/grappled.svg',
    description: 'While Grappled, you cannot use two-handed weapons and your speed is impacted by the other Grappled creature. See rules for details on movement.',
    changes: [],
    flags: { "mythcraft-hud": { "grappled": true } }
  },
  {
    id: 'grounded',
    label: 'Grounded',
    img: 'modules/mythcraft-hud/icons/conditions/grounded.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/grounded.svg',
    description: 'You cannot teleport or move to a different plane, nor can an external effect impose teleportation or plane-shifting effects on you.',
    changes: [],
    flags: { "mythcraft-hud": { "grounded": true } }
  },
  {
    id: 'helpless',
    label: 'Helpless',
    img: 'modules/mythcraft-hud/icons/conditions/helpless.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/helpless.svg',
    description: 'When you take melee damage, you lose all of your HP.',
    changes: [],
    flags: { "mythcraft-hud": { "helpless": true } }
  },
  {
    id: 'paralyzed',
    label: 'Paralyzed',
    img: 'modules/mythcraft-hud/icons/conditions/paralyzed.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/paralyzed.svg',
    description: 'You are Helpless and your AP becomes 0. You gain 0 AP at the start of each of your turns while Paralyzed. A creature with creature actions cannot take any creature actions or reactions while Paralyzed.',
    changes: [
        { key: 'system.ap.value', mode: MODE_OVERRIDE, value: "0" }
    ],
    flags: { "mythcraft-hud": { "paralyzed": true, "helpless": true } }
  },
  {
    id: 'petrified',
    label: 'Petrified',
    img: 'modules/mythcraft-hud/icons/conditions/petrified.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/petrified.svg',
    description: 'You are Paralyzed. Your body is physically transformed into stone or a similar material as specified by the source of the condition. The source of the condition will also specify how to end the condition, such as with the Greater Restoration divine ritual.',
    changes: [],
    flags: { "mythcraft-hud": { "petrified": true, "paralyzed": true } }
  },
  {
    id: 'phobic',
    label: 'Phobic',
    img: 'modules/mythcraft-hud/icons/conditions/phobic.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/phobic.svg',
    description: 'You are Frightened when you can see the subject of your phobia. This effect is permanent until removed.',
    changes: [],
    flags: { "mythcraft-hud": { "phobic": true, "frightened": true } }
  },
  {
    id: 'pinned',
    label: 'Pinned',
    img: 'modules/mythcraft-hud/icons/conditions/pinned.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/pinned.svg',
    description: 'You are Prone, Grappled, and suffer 1 TD on attacks. Creatures making melee attacks against you gain +1 TA, and creatures making ranged attacks against you suffer 1 TD.',
    changes: [
      { key: 'system.bonuses.td.all', mode: MODE_ADD, value: "1" }
    ],
    flags: { "mythcraft-hud": { "pinned": true, "prone": true, "grappled": true } }
  },
  {
    id: 'prone',
    label: 'Prone',
    img: 'modules/mythcraft-hud/icons/conditions/prone.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/prone.svg',
    description: 'You suffer 1 TD on all attacks while Prone, and cannot make attacks with two-handed weapons. Additionally, melee attacks against you have +1 TA, and ranged attacks against you suffer 1 TD.',
    changes: [
      { key: 'system.bonuses.td.all', mode: MODE_ADD, value: "1" }
    ],
    flags: { "mythcraft-hud": { "prone": true } }
  },
  {
    id: 'protected',
    label: 'Protected',
    img: 'modules/mythcraft-hud/icons/conditions/protected.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/protected.svg',
    description: 'You gain +2 to your AR and physical defenses while Protected.',
    changes: [
      { key: 'system.defenses.ar', mode: MODE_ADD, value: "2" },
      { key: 'system.defenses.ref', mode: MODE_ADD, value: "2" },
      { key: 'system.defenses.fort', mode: MODE_ADD, value: "2" }
    ]
  },
  {
    id: 'rallied',
    label: 'Rallied',
    img: 'modules/mythcraft-hud/icons/conditions/rallied.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/rallied.svg',
    description: 'You cannot be Demoralized, Frightened, or Shaken. If you are already suffering from one of these conditions, the effects are suppressed while you are Rallied.',
    changes: [],
    flags: { "mythcraft-hud": { "rallied": true } }
  },
  {
    id: 'restrained',
    label: 'Restrained',
    img: 'modules/mythcraft-hud/icons/conditions/restrained.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/restrained.svg',
    description: 'A creature is Grappled. When attacking a Restrained creature, roll 2d20 and take the higher. Unless otherwise stated, escaping the Restrained condition is the same as escaping the Grappled condition, but requires 3 AP (or two creature actions).',
    changes: [],
    flags: { "mythcraft-hud": { "restrained": true, "grappled": true } }
  },
  {
    id: 'shaken',
    label: 'Shaken',
    img: 'modules/mythcraft-hud/icons/conditions/shaken.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/shaken.svg',
    description: 'You suffer a -2 penalty to all d20 rolls.',
    changes: [
      { key: 'system.bonuses.rolls.all', mode: MODE_ADD, value: "-2" }
    ]
  },
  {
    id: 'sickened',
    label: 'Sickened',
    img: 'modules/mythcraft-hud/icons/conditions/sickened.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/sickened.svg',
    description: 'Whenever rolling a d20, roll 2d20 and take the lower result.',
    changes: [],
    flags: { "mythcraft-hud": { "sickened": true } }
  },
  {
    id: 'silenced',
    label: 'Silenced',
    img: 'modules/mythcraft-hud/icons/conditions/silenced.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/silenced.svg',
    description: 'You cannot vocalize. You automatically fail any roll that requires the ability to speak or use verbal components.',
    changes: [],
    flags: { "mythcraft-hud": { "silenced": true } }
  },
  {
    id: 'slowed',
    label: 'Slowed',
    img: 'modules/mythcraft-hud/icons/conditions/slowed.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/slowed.svg',
    description: 'Your speed is halved.',
    changes: [
      { key: 'system.movement.speed.value', mode: MODE_MULTIPLY, value: "0.5" }
    ]
  },
  {
    id: 'staggered',
    label: 'Staggered',
    img: 'modules/mythcraft-hud/icons/conditions/staggered.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/staggered.svg',
    description: 'You gain half the AP than you normally would at the start of each of your turns. A creature that uses creature actions can take only 1⁄2 the creature actions that it normally would.',
    changes: [],
    flags: { "mythcraft-hud": { "staggered": true } }
  },
  {
    id: 'stunned',
    label: 'Stunned',
    img: 'modules/mythcraft-hud/icons/conditions/stunned.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/stunned.svg',
    description: 'Your current AP is reduced to 1, unless it was already 1 or lower. You gain only 1 AP at the start of your turns and your AP cannot be raised above 1 while Stunned. If a creature uses creature actions, the number of actions they have is reduced to 1.',
    changes: [],
    flags: { "mythcraft-hud": { "stunned": true } }
  },
  {
    id: 'suffocating',
    label: 'Suffocating',
    img: 'modules/mythcraft-hud/icons/conditions/suffocating.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/suffocating.svg',
    description: 'After Suffocating for a number of rounds equal to your END +1, you gain a Death Point at the start of each of your turns.',
    changes: [],
    flags: { "mythcraft-hud": { "suffocating": true } }
  },
  {
    id: 'suppressed',
    label: 'Suppressed',
    img: 'modules/mythcraft-hud/icons/conditions/suppressed.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/suppressed.svg',
    description: 'You cannot use your AP to move. A creature that uses creature actions cannot use them to move.',
    changes: [],
    flags: { "mythcraft-hud": { "suppressed": true } }
  },
  {
    id: 'surprised-complete',
    label: 'Surprised (Complete)',
    img: 'modules/mythcraft-hud/icons/conditions/surprised(complete).svg',
    icon: 'modules/mythcraft-hud/icons/conditions/surprised(complete).svg',
    description: 'Complete Surprise only occurs when a creature attacks an enemy under all of the following conditions: The target does not perceive the attacker and is unaware of their presence. The target is not in a heightened state of awareness or on alert. For example, an alarm being raised, or being actively in combat, even if it is with a third party, disallows a full surprise round. In this instance, the creature who begins combat is granted double their AP and takes a single turn.',
    changes: [],
    flags: { "mythcraft-hud": { "surprised": true } }
  },
  {
    id: 'surprised-partial',
    label: 'Surprised (Partial)',
    img: 'modules/mythcraft-hud/icons/conditions/surprised(partial).svg',
    icon: 'modules/mythcraft-hud/icons/conditions/surprised(partial).svg',
    description: 'If creatures are Surprised, they do not act on the first round of Initiative and have TD on the second round. They cannot use reactive actions until after their first turn in which they can take action, and do not carry over AP until after their first turn in which they can take action.',
    changes: [],
    flags: { "mythcraft-hud": { "surprised": true } }
  },
  {
    id: 'taunted',
    label: 'Taunted',
    img: 'modules/mythcraft-hud/icons/conditions/taunted.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/taunted.svg',
    description: 'You have +1 TA attacking the creature that Taunted you, and suffer 1 TD attacking other creatures.',
    changes: [],
    flags: { "mythcraft-hud": { "taunted": true } }
  },
  {
    id: 'unconscious',
    label: 'Unconscious',
    img: 'modules/mythcraft-hud/icons/conditions/unconscious.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/unconscious.svg',
    description: 'The creature must roll 3d20 and take the lowest result to AWR/Perceiving checks that rely on sound. They automatically fail checks that rely on vision. A creature can be shaken awake by another creature who expends 1 AP as long as they have at least 1 HP. Taking any damage automatically ends this effect. Hits on an Unconscious creature are automatically critical.',
    changes: [],
    flags: { "mythcraft-hud": { "unconscious": true } }
  },
  {
    id: 'unseen',
    label: 'Unseen',
    img: 'modules/mythcraft-hud/icons/conditions/unseen.svg',
    icon: 'modules/mythcraft-hud/icons/conditions/unseen.svg',
    description: 'An Unseen creature gains +1 TA, and when it makes an attack, it rolls 2d20 and takes the higher result. It cannot be targeted by Line of Sight effects. Unseen creatures are also considered Concealed.',
    changes: [
      { key: 'system.bonuses.ta', mode: MODE_ADD, value: "1" }
    ],
    flags: { "mythcraft-hud": { "unseen": true } }
  }
];
