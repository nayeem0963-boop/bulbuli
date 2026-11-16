/**
 * Sources used by Phase 2A content, each fetched and read on `verifiedOn`. Every content item cites
 * one of these and quotes, in `supports`, the exact sentence on that page that supports its fact.
 * Facts a page did not state were left out of the content (they are listed in `notSupported` so
 * nobody adds them later on the strength of these pages).
 */
// Dates are UTC. First fetched and checked 2026-11-02; every quote below was re-fetched and found
// again on its live page at about 22:00 UTC on 2026-11-02 (04:00 on 3 Nov in Dhaka), the Cal
// Academy page via its blog.calacademy.org address.
export const VERIFIED_ON = '2026-11-02'

export const SOURCES = Object.freeze({
  skyBlue: {
    url: 'https://www.nesdis.noaa.gov/about/k-12-education/atmosphere/why-the-sky-blue',
    publisher: 'NOAA NESDIS',
    title: 'Why Is the Sky Blue?',
    quotes: [
      'The white light coming from the Sun is really made up of all the colors of the rainbow.',
      'Blue light is scattered more than other colors because it travels as shorter, smaller waves.',
      'The scattered violet and blue light dominates the sky, making it appear blue.',
      'As the Sun gets lower in the sky, its light passes through more of the atmosphere to reach you.',
      'Even more of the blue and violet light is scattered, allowing the reds and yellows to pass straight through to your eyes.',
    ],
  },
  sun: {
    url: 'https://spaceplace.nasa.gov/all-about-the-sun',
    publisher: 'NASA Space Place',
    title: 'All About the Sun',
    quotes: [
      'A star is a hot, glowing ball of gas.',
      'The light of daytime comes from our closest star: the Sun.',
      'Heat from the Sun makes Earth warm enough to live on.',
      'Without light from the Sun, there would be no plants or animals—and, therefore, no food and we wouldn\'t exist.',
      'Our Sun is about 100 times wider than Earth, but it is just an average sized star.',
      'The Sun contains almost ALL of the material in our solar system. 99% of it.',
    ],
  },
  rainbow: {
    url: 'https://weather.metoffice.gov.uk/learn-about/weather/optical-effects/rainbows',
    publisher: 'Met Office',
    title: 'Rainbows: optical wonders',
    quotes: [
      'A rainbow is created through the refraction and reflection of sunlight in water droplets.',
      'When sunlight passes through a raindrop, it slows down and bends (refracts), splitting into its component colours.',
      'For a rainbow to appear, the Sun must be behind you and water droplets in front.',
      'The classic order is red, orange, yellow, green, blue, indigo, and violet (ROYGBIV), with red having the longest wavelength and violet the shortest.',
    ],
  },
  dayNight: {
    url: 'https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question31.html',
    publisher: 'NASA StarChild (Goddard Space Flight Center)',
    title: 'Why is there day and night?',
    quotes: [
      'the Earth rotates on its axis',
      'When where you are is pointed toward the Sun, it is day.',
      'one complete spin in 24 hours',
      'seems to move across the sky starting in the east in the morning',
    ],
  },
  shadow: {
    url: 'https://astroedu.iau.org/activities/suns-shadow/',
    publisher: 'astroEDU (International Astronomical Union)',
    title: "Sun's shadow",
    quotes: [
      "If the Sun's rays are incident on an object, the shadow is oriented away from the Sun.",
      'The shadow length changes through the course of a day as well as through the year',
    ],
    notSupported: ['shadows are shortest at midday', 'shadows are longest in the morning and evening'],
  },
  clouds: {
    url: 'https://www.nasa.gov/science-research/earth-science/what-are-clouds-grades-k-4/',
    publisher: 'NASA',
    title: 'What Are Clouds? (Grades K-4)',
    quotes: [
      'A cloud is made of water drops or ice crystals floating in the sky.',
      'As the water vapor goes higher in the sky, the air gets cooler.',
      'The droplets are so light they float in the air.',
      'When that happens, gravity causes them to fall to Earth.',
      'When the air is colder, the water may form snowflakes instead.',
    ],
    notSupported: ['dark clouds carry more rain'],
  },
  cloudBottle: {
    url: 'https://www.jpl.nasa.gov/edu/learn/project/make-a-cloud-in-a-bottle',
    publisher: 'NASA Jet Propulsion Laboratory (JPL) Education',
    title: 'Make a Cloud in a Bottle',
    quotes: [
      'Clouds form from the condensation or freezing of water vapor.',
      'When water vapor cools, it turns into a liquid – or condenses – onto a surface.',
      'Water vapor in the atmosphere cools and condenses on particles in the air, creating a cloud.',
    ],
  },
  waterCycle: {
    url: 'https://water.usgs.gov/edu/watercycle-kids-int.html',
    publisher: 'U.S. Geological Survey (USGS)',
    title: 'Interactive Water Cycle Diagram for Kids (Intermediate)',
    quotes: [
      'Evaporation changes liquid and frozen water into water-vapor gas, which then floats up into the skies to become clouds.',
      "The sun's energy breaks the bonds that hold liquid water's molecules together and turns them into water vapor gas.",
      'All air contains water molecules in the form of water vapor, which is an invisible gas.',
      'The sun is what makes the water cycle work.',
      'Runoff is nothing more than water "running off" the land surface.',
      'In many places, the snow builds up all winter and does not begin to melt until spring.',
    ],
  },
  wind: {
    url: 'https://scijinks.gov/about/k-12-education/atmosphere/why-does-wind-blow',
    publisher: 'NOAA SciJinks / NASA Space Place',
    title: 'Why Does Wind Blow?',
    quotes: [
      'The sun warms up the air, but it does so unevenly.',
      'When gases warm up, the atoms and molecules move faster, spread out, and rise.',
      'Gases move from high-pressure areas to low-pressure areas.',
      'the bigger the difference between the pressures, the faster the air will move from the high to the low pressure.',
    ],
  },
  thunder: {
    url: 'https://www.weather.gov/safety/lightning-science-thunder',
    publisher: 'U.S. National Weather Service (NOAA)',
    title: 'Understanding Lightning: Thunder',
    quotes: [
      'Thunder is created when lightning passes through the air.',
      'The lightning discharge heats the air rapidly and causes it to expand.',
      'it takes the sound of thunder about 5 seconds to travel a mile',
      'can be heard for a distance of only about 10 miles from the lightning strike',
    ],
  },
  fog: {
    url: 'https://museum.wales/blog/2479/What-is-fog/',
    publisher: 'Amgueddfa Cymru – Museum Wales',
    title: 'What is fog?',
    quotes: [
      'Fog can also be described as a cloud forming at ground level.',
      'Fog is made of water droplets smaller than rain drops.',
      'Water vapour in the air cools to form water droplets.',
      'Fog often forms when warm, moist air is cooled by cold surfaces.',
    ],
  },
  /* ---------------- World Explorer 3D (Stage 2A-3). Fetched 2026-11-02 through the session's web
     fetch tool, which returns extracted page text; short exact phrases were taken from that text.
     The science reviewer should still confirm each phrase on the live page. */
  sundarbans: {
    url: 'https://whc.unesco.org/en/list/798',
    publisher: 'UNESCO World Heritage Centre',
    title: 'The Sundarbans',
    quotes: [
      'lies on the delta of the Ganges, Brahmaputra and Meghna rivers on the Bay of Bengal.',
      'formed from sediments deposited by three great rivers; the Ganges, Brahmaputra and Meghna,',
      'is the largest contiguous mangrove forest in the world.',
      'perennially washed by brackish water shrilling in and around the endless and mind-boggling labyrinths of water channels.',
      'the land has been moulded by tidal action, resulting in a distinctive physiology.',
      'a complex network of tidal waterways, mudflats and small islands of salt-tolerant mangrove forests,',
      'It is the only mangrove habitat in the world for Panthera tigris tigris species.',
      'acts as a shelter belt to protect the people from storms, cyclones, tidal surges, sea water seepage and intrusion.',
      'The area is known for its wide range of fauna, including 260 bird species,',
      '60% of the property lies in Bangladesh and the rest in India.',
    ],
    notSupported: ['tiger population numbers (the page gives an estimate we did not date-check)', 'the forest area in km²'],
  },
  mangroveRoots: {
    url: 'https://www.livingoceansfoundation.org/all-about-mangroves-why-do-mangroves-have-aerial-roots',
    publisher: 'Khaled bin Sultan Living Oceans Foundation',
    title: 'All About Mangroves: Why Do Mangroves Have Aerial Roots?',
    quotes: [
      'However, in the soil surrounding mangroves, oxygen is often scarce.',
      'These aerial roots (also known as breathing roots) allow mangroves to exchange gases, including oxygen, with the air.',
      'This gas exchange happens through tiny openings in the roots called lenticels.',
      'In addition, mangroves thrive in salty, flooded environments where most trees cannot survive.',
      'For example, they help stabilize the soil and prevent erosion in coastal areas.',
      'This natural barrier helps protect coastlines from the destructive forces of waves, storm surges, and tidal fluctuations.',
    ],
    notSupported: ['which mangrove species grow in the Sundarbans', 'how mangroves remove salt'],
  },
  amazonWwf: {
    url: 'https://www.worldwildlife.org/stories/what-animals-live-in-the-amazon-and-8-other-amazon-facts',
    publisher: 'World Wildlife Fund (WWF)',
    title: 'What animals live in the Amazon? And 8 other Amazon facts',
    quotes: [
      'It is the world’s largest rainforest and river system, and the most biologically diverse place on Earth.',
      'It contains millions of species, most of them still undescribed.',
      'Over 2,000 new species of plants and vertebrates, including a monkey that purrs like a cat, have been described since 1999.',
      'Since the year 2000, rainfall has declined across 69% of the Amazon forest.',
      'Macaws, an icon of the Amazon, are highly intelligent and social, living in flocks of 10 to 30 birds.',
    ],
    notSupported: ['the number of countries the Amazon covers', 'its area', 'the share of all species on Earth'],
  },
  amazonRain: {
    url: 'https://www.nationalgeographic.com/animals/article/amazon-losing-flying-rivers-ability-to-curb-warming',
    publisher: 'National Geographic',
    title: 'Amazon Losing "Flying Rivers," Ability to Curb Warming',
    quotes: [
      'In a process called evapotranspiration, trees draw water from their roots and then "transpire" some of that water back into the air.',
      'a single large tree in the center of the Amazon forest can give off up to 317 quarts (300 liters) of water in a day.',
      'more than half of the Amazon\'s rainfall emanates from trees, with the rest coming from vapor from surface water bodies.',
      'So if the trees are chopped down, the rainfall rates could be reduced through this mechanism,',
    ],
    notSupported: ['the speed of the "flying rivers" (the page\'s figure looks like a typo, so it is not used)'],
  },
  rainforestLayers: {
    url: 'https://calacademy.org/educators/lesson-plans/jungle-layers',
    publisher: 'California Academy of Sciences',
    title: 'Jungle Layers (lesson plan)',
    quotes: [
      'The canopy, the top layer of the rainforest, receives most of the sun’s rays with only a few emergent trees towering higher.',
      'Its dense layer of leaves and branches provide shade for the lower layers.',
      'The canopy is home to many animals such as birds and monkeys that live and eat in the treetops.',
      'The understory is a dim environment with shorter plants than those that reach the canopy.',
      'The forest floor is even darker than the understory.',
      'A thin layer of leaf litter coats the forest floor, which is home to decomposers such as fungi, insects and microorganisms.',
    ],
  },
  sahara: {
    url: 'https://www.livescience.com/23140-sahara-desert.html',
    publisher: 'Live Science',
    title: 'The Sahara: Earth\'s largest hot desert',
    quotes: [
      'The Sahara is the largest hot desert in the world and the third-largest desert overall',
      'third-largest desert overall, behind the cold deserts of Antarctica and the Arctic.',
      'mountains, plateaus, sand- and gravel-covered plains, salt flats',
      'When Earth\'s axis tilted the Northern Hemisphere just a single degree closer to the sun',
      'an area about the size of the United States (including Alaska and Hawaii)',
      'The dunes can reach almost 600 feet (183 meters) high, and they cover about 25% of the entire desert',
      'Precipitation in the Sahara ranges from zero to about 3 inches (7.6 centimeters) of rain per year',
      'The humps on a camel\'s back store fat, which can be used for energy and hydration in between meals.',
      'Camels store energy so efficiently that they can go more than a week without water and several months without food.',
      'it alternates between harsh desert and another extreme — a lush, green oasis — every 20,000 years',
      'which increased the monsoon rains and, therefore, supported a lush, green landscape in the Sahara',
      'roots that reach deep underground to find buried water sources',
    ],
    notSupported: ['the exact share of rock and gravel (the page gives only the dune share)', 'day–night temperature swings on the same day'],
  },
  saharaKids: {
    url: 'https://kids.britannica.com/students/article/Sahara/276838',
    publisher: 'Britannica (Britannica Kids, student edition)',
    title: 'Sahara',
    quotes: [
      'This vast sunbaked land of barren rock, gravel, and shifting sand stretches across northern Africa.',
      'Palm trees and crops can be grown only where there is a spring, a well, or a stream.',
      'These fertile spots are called oases (singular, oasis).',
    ],
  },
})
