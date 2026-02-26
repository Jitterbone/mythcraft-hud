(async () => {
  const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

  if (!actor) {
    ui.notifications.warn("Please select a token with all the skills, or assign a character to your user.");
  } else {
    const skills = actor.system.skills;
    if (!skills) {
      console.log(`No skills found for actor: ${actor.name}`);
      return;
    }
    
    const skillMappings = {};

    for (const [key, skillData] of Object.entries(skills)) {
      const attribute = skillData.attribute || skillData.ability || 'undefined';
      if (!skillMappings[attribute]) {
          skillMappings[attribute] = [];
      }
      skillMappings[attribute].push(key);
    }

    // Log the results in a clean, sorted format
    console.log(`--- Skill Mappings for ${actor.name} ---`);
    const sortedAttributes = Object.keys(skillMappings).sort();
    
    for (const attr of sortedAttributes) {
      console.log(`\n[${attr.toUpperCase()}]`);
      const sortedSkills = skillMappings[attr].sort();
      sortedSkills.forEach(skillKey => {
        console.log(`  - ${skillKey}`);
      });
    }
    console.log(`\n--- End of Report ---`);
    ui.notifications.info("Skill mapping report has been printed to the console (F12).");
  }
})();
