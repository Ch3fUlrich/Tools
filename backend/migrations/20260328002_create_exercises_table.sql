-- Create muscle_groups, exercises, and exercise_muscles tables for training tracker
-- Includes seed data for 18 muscle groups and ~55 default exercises

-- ============================================================================
-- MUSCLE GROUPS (18 groups with anthropometric relative sizes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS muscle_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    relative_size DECIMAL(5,3) NOT NULL,
    body_map_position TEXT NOT NULL,
    svg_region_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_muscle_groups_name ON muscle_groups(lower(name));

-- ============================================================================
-- EXERCISES
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    movement_pattern TEXT NOT NULL CHECK (movement_pattern IN (
        'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull',
        'squat', 'hinge', 'lunge', 'isolation_upper', 'isolation_lower',
        'core', 'carry', 'plyometric', 'bodyweight_compound'
    )),
    equipment TEXT NOT NULL DEFAULT 'barbell' CHECK (equipment IN (
        'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'band', 'other'
    )),
    difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN (
        'beginner', 'intermediate', 'advanced'
    )),
    is_bodyweight BOOLEAN NOT NULL DEFAULT FALSE,
    is_unilateral BOOLEAN NOT NULL DEFAULT FALSE,
    primary_segments_moved TEXT[] NOT NULL DEFAULT '{}',
    rom_degrees DECIMAL(5,1) DEFAULT 90.0,
    body_mass_fraction_moved DECIMAL(5,3) DEFAULT 0.0,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_pattern ON exercises(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);

-- ============================================================================
-- EXERCISE-MUSCLE JOIN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS exercise_muscles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id UUID NOT NULL REFERENCES muscle_groups(id) ON DELETE CASCADE,
    involvement TEXT NOT NULL CHECK (involvement IN ('primary', 'secondary', 'stabilizer')),
    activation_fraction DECIMAL(4,3) NOT NULL DEFAULT 1.0,
    UNIQUE (exercise_id, muscle_group_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise ON exercise_muscles(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle ON exercise_muscles(muscle_group_id);

-- ============================================================================
-- SEED: 18 MUSCLE GROUPS (Dempster/Winter anthropometric data)
-- ============================================================================
INSERT INTO muscle_groups (name, display_name, relative_size, body_map_position, svg_region_id) VALUES
('chest',         'Chest (Pectorals)',         0.100, 'front', 'muscle-chest'),
('front_deltoid', 'Front Deltoid',             0.025, 'front', 'muscle-front-delt'),
('side_deltoid',  'Side Deltoid',              0.020, 'front', 'muscle-side-delt'),
('rear_deltoid',  'Rear Deltoid',              0.020, 'back',  'muscle-rear-delt'),
('biceps',        'Biceps',                    0.030, 'front', 'muscle-biceps'),
('triceps',       'Triceps',                   0.035, 'back',  'muscle-triceps'),
('forearms',      'Forearms',                  0.025, 'front', 'muscle-forearms'),
('upper_back',    'Upper Back (Traps/Rhombs)', 0.070, 'back',  'muscle-upper-back'),
('lats',          'Latissimus Dorsi',          0.090, 'back',  'muscle-lats'),
('lower_back',    'Lower Back (Erectors)',     0.050, 'back',  'muscle-lower-back'),
('abs',           'Abdominals',                0.050, 'front', 'muscle-abs'),
('obliques',      'Obliques',                  0.030, 'front', 'muscle-obliques'),
('glutes',        'Glutes',                    0.120, 'back',  'muscle-glutes'),
('quadriceps',    'Quadriceps',                0.110, 'front', 'muscle-quads'),
('hamstrings',    'Hamstrings',                0.070, 'back',  'muscle-hamstrings'),
('hip_flexors',   'Hip Flexors',               0.020, 'front', 'muscle-hip-flexors'),
('calves',        'Calves',                    0.040, 'back',  'muscle-calves'),
('neck',          'Neck',                      0.015, 'front', 'muscle-neck')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED: DEFAULT EXERCISES (~55 exercises)
-- ============================================================================

-- BARBELL EXERCISES (12)
INSERT INTO exercises (name, description, movement_pattern, equipment, difficulty, is_bodyweight, is_unilateral, primary_segments_moved, rom_degrees, body_mass_fraction_moved, is_system_default, metadata) VALUES
('Barbell Bench Press (Flat)', 'Lie on a flat bench, grip barbell slightly wider than shoulder width, lower to chest and press up.', 'horizontal_push', 'barbell', 'intermediate', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Lie flat on bench with feet on floor","Grip bar slightly wider than shoulder width","Unrack and lower bar to mid-chest","Press bar up to full arm extension"],"tips":["Keep shoulder blades retracted and depressed","Maintain slight arch in lower back","Drive feet into floor for stability"],"common_mistakes":["Bouncing bar off chest","Flaring elbows too wide","Lifting hips off bench"]}'),

('Barbell Bench Press (Incline)', 'Perform bench press on a 30-45 degree incline bench to emphasize upper chest.', 'horizontal_push', 'barbell', 'intermediate', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Set bench to 30-45 degree incline","Grip bar slightly wider than shoulder width","Lower bar to upper chest","Press up to full extension"],"tips":["Keep back against the bench","Slightly narrower grip than flat bench"],"common_mistakes":["Setting incline too steep","Pressing bar too far forward"]}'),

('Barbell Bench Press (Decline)', 'Perform bench press on a decline bench to emphasize lower chest.', 'horizontal_push', 'barbell', 'intermediate', FALSE, FALSE, '{upper_arm,lower_arm}', 85.0, 0.0, TRUE,
 '{"instructions":["Secure legs under pads on decline bench","Grip bar at shoulder width","Lower bar to lower chest","Press up to full extension"],"tips":["Have a spotter for safety","Reduced range of motion compared to flat"],"common_mistakes":["Letting bar drift toward face","Not securing legs properly"]}'),

('Back Squat', 'Place barbell on upper traps, squat down until thighs are parallel or below, then stand up.', 'squat', 'barbell', 'intermediate', FALSE, FALSE, '{upper_leg,lower_leg}', 120.0, 0.0, TRUE,
 '{"instructions":["Position bar on upper traps","Unrack and step back with feet shoulder width","Break at hips and knees simultaneously","Descend until thighs are at least parallel","Drive up through heels to standing"],"tips":["Keep chest up and core braced","Push knees out over toes","Maintain neutral spine"],"common_mistakes":["Knees caving inward","Rounding lower back","Rising on toes"]}'),

('Front Squat', 'Hold barbell in front rack position across front deltoids, squat to depth.', 'squat', 'barbell', 'intermediate', FALSE, FALSE, '{upper_leg,lower_leg}', 120.0, 0.0, TRUE,
 '{"instructions":["Position bar on front deltoids with clean or cross grip","Keep elbows high throughout","Descend to full depth","Drive up maintaining upright torso"],"tips":["Requires good wrist and shoulder mobility","More quad-dominant than back squat"],"common_mistakes":["Elbows dropping","Leaning too far forward","Wrists bearing the load"]}'),

('Deadlift (Conventional)', 'Lift barbell from floor to hip height with straight arms, hip-hinge pattern.', 'hinge', 'barbell', 'intermediate', FALSE, FALSE, '{upper_leg,lower_leg,torso}', 90.0, 0.0, TRUE,
 '{"instructions":["Stand with feet hip width, shins close to bar","Hinge at hips, grip bar just outside knees","Brace core, flatten back","Drive through floor, extending hips and knees together","Lock out at top with hips fully extended"],"tips":["Keep bar close to body throughout","Think about pushing the floor away","Engage lats to keep bar path straight"],"common_mistakes":["Rounding lower back","Jerking the bar off floor","Hyperextending at lockout"]}'),

('Deadlift (Sumo)', 'Wide-stance deadlift with hands inside knees, emphasizes hips and quads more.', 'hinge', 'barbell', 'intermediate', FALSE, FALSE, '{upper_leg,lower_leg,torso}', 80.0, 0.0, TRUE,
 '{"instructions":["Take wide stance with toes pointed out","Grip bar inside knees","Drop hips, keep chest up","Drive through floor extending hips"],"tips":["Requires good hip mobility","Push knees out over toes","Shorter range of motion than conventional"],"common_mistakes":["Hips rising too fast","Knees caving in","Stance too wide"]}'),

('Romanian Deadlift', 'Hip hinge with slight knee bend, lower bar to mid-shin keeping it close to legs.', 'hinge', 'barbell', 'intermediate', FALSE, FALSE, '{upper_leg,torso}', 90.0, 0.0, TRUE,
 '{"instructions":["Hold bar at hip height with overhand grip","Push hips back while maintaining slight knee bend","Lower bar along thighs to mid-shin","Drive hips forward to return to start"],"tips":["Feel stretch in hamstrings","Keep bar close to body","Maintain neutral spine throughout"],"common_mistakes":["Rounding the back","Bending knees too much","Lowering bar too far"]}'),

('Overhead Press', 'Press barbell from shoulder height to overhead lockout while standing.', 'vertical_push', 'barbell', 'intermediate', FALSE, FALSE, '{upper_arm,lower_arm}', 150.0, 0.0, TRUE,
 '{"instructions":["Hold bar at shoulder height with grip just outside shoulders","Brace core and squeeze glutes","Press bar overhead in slight arc around face","Lock out arms fully overhead"],"tips":["Lean torso slightly back then forward as bar passes head","Keep ribcage down","Full lockout overhead"],"common_mistakes":["Excessive back arch","Not locking out fully","Using leg drive (push press)"]}'),

('Barbell Row (Bent-Over)', 'Hinge forward and row barbell to lower chest/upper abdomen.', 'horizontal_pull', 'barbell', 'intermediate', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Hinge at hips to about 45 degrees","Grip bar slightly wider than shoulder width","Pull bar to lower chest/upper abdomen","Lower with control"],"tips":["Keep core braced throughout","Squeeze shoulder blades together at top","Maintain hip hinge angle"],"common_mistakes":["Using too much body English","Standing too upright","Jerking the weight"]}'),

('Barbell Curl', 'Curl barbell from arms extended to full flexion, isolating biceps.', 'isolation_upper', 'barbell', 'beginner', FALSE, FALSE, '{lower_arm}', 130.0, 0.0, TRUE,
 '{"instructions":["Stand with bar at arms length, palms forward","Curl bar up by flexing elbows","Squeeze at top","Lower with control"],"tips":["Keep elbows pinned to sides","Use full range of motion","Control the eccentric"],"common_mistakes":["Swinging body for momentum","Moving elbows forward","Using too much weight"]}'),

('Barbell Lunge', 'Step forward into a lunge with barbell on back, alternating legs.', 'lunge', 'barbell', 'intermediate', FALSE, TRUE, '{upper_leg,lower_leg}', 110.0, 0.0, TRUE,
 '{"instructions":["Position bar on upper back as in squat","Step forward into lunge position","Lower until back knee nearly touches floor","Push through front heel to return"],"tips":["Keep torso upright","Front knee tracks over toes","Control the descent"],"common_mistakes":["Knee passing too far over toes","Leaning trunk forward","Short stride length"]}')
ON CONFLICT DO NOTHING;

-- DUMBBELL EXERCISES (10)
INSERT INTO exercises (name, description, movement_pattern, equipment, difficulty, is_bodyweight, is_unilateral, primary_segments_moved, rom_degrees, body_mass_fraction_moved, is_system_default, metadata) VALUES
('Dumbbell Bench Press (Flat)', 'Press dumbbells from chest level to full arm extension while lying flat.', 'horizontal_push', 'dumbbell', 'intermediate', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Lie on flat bench holding dumbbells at chest height","Press dumbbells up and slightly inward","Lower with control to chest level"],"tips":["Greater range of motion than barbell","Each arm works independently","Can rotate wrists during press"],"common_mistakes":["Dumbbells drifting apart","Not going deep enough","Uneven pressing"]}'),

('Dumbbell Bench Press (Incline)', 'Incline dumbbell press on 30-45 degree bench for upper chest emphasis.', 'horizontal_push', 'dumbbell', 'intermediate', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Set bench to 30-45 degrees","Press dumbbells from chest to full extension","Lower with control"],"tips":["Excellent for upper chest development","Allows natural wrist rotation"],"common_mistakes":["Incline too steep","Arching excessively"]}'),

('Dumbbell Row (Single-Arm)', 'Row dumbbell to hip with one arm while supporting on bench with the other.', 'horizontal_pull', 'dumbbell', 'beginner', FALSE, TRUE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Place one knee and hand on bench","Hold dumbbell in free hand, arm extended","Row dumbbell to hip","Lower with control"],"tips":["Keep back flat and parallel to floor","Pull elbow past torso","Squeeze shoulder blade at top"],"common_mistakes":["Rotating torso","Not pulling high enough","Using momentum"]}'),

('Dumbbell Shoulder Press', 'Press dumbbells from shoulder height to overhead while seated or standing.', 'vertical_push', 'dumbbell', 'beginner', FALSE, FALSE, '{upper_arm,lower_arm}', 150.0, 0.0, TRUE,
 '{"instructions":["Hold dumbbells at shoulder height, palms forward","Press overhead to full extension","Lower with control to starting position"],"tips":["Can be done seated for more stability","Allows natural pressing arc"],"common_mistakes":["Excessive back arch","Not locking out","Pressing too far forward"]}'),

('Dumbbell Curl', 'Curl dumbbells from full extension to flexion, alternating or simultaneously.', 'isolation_upper', 'dumbbell', 'beginner', FALSE, FALSE, '{lower_arm}', 130.0, 0.0, TRUE,
 '{"instructions":["Stand holding dumbbells at sides, palms forward","Curl both dumbbells up simultaneously","Squeeze at top, lower with control"],"tips":["Can alternate arms for heavier weight","Supinate wrists during curl for peak contraction"],"common_mistakes":["Swinging for momentum","Moving elbows","Incomplete range of motion"]}'),

('Dumbbell Hammer Curl', 'Curl dumbbells with neutral (hammer) grip to target brachialis and forearms.', 'isolation_upper', 'dumbbell', 'beginner', FALSE, FALSE, '{lower_arm}', 130.0, 0.0, TRUE,
 '{"instructions":["Hold dumbbells at sides with neutral grip (palms facing each other)","Curl up keeping neutral grip throughout","Lower with control"],"tips":["Targets brachialis and brachioradialis more than standard curl","Good for forearm development"],"common_mistakes":["Converting to standard curl grip","Using body momentum"]}'),

('Dumbbell Lateral Raise', 'Raise dumbbells out to sides to shoulder height for side deltoid isolation.', 'isolation_upper', 'dumbbell', 'beginner', FALSE, FALSE, '{upper_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Stand holding dumbbells at sides","Raise arms out to sides until parallel with floor","Lower with control"],"tips":["Slight bend in elbows throughout","Lead with elbows, not hands","Lighter weight with strict form"],"common_mistakes":["Using too much weight","Shrugging shoulders up","Swinging body"]}'),

('Dumbbell Fly', 'Open arms wide then bring dumbbells together in an arc motion while lying flat.', 'horizontal_push', 'dumbbell', 'intermediate', FALSE, FALSE, '{upper_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Lie on bench with dumbbells pressed above chest","Lower dumbbells in wide arc with slight elbow bend","Bring dumbbells back together squeezing chest"],"tips":["Maintain constant slight elbow bend","Feel stretch in chest at bottom","Control the weight throughout"],"common_mistakes":["Straightening arms (turns into press)","Going too heavy","Excessive range of motion"]}'),

('Dumbbell Lunge', 'Step forward or backward into lunge while holding dumbbells at sides.', 'lunge', 'dumbbell', 'beginner', FALSE, TRUE, '{upper_leg,lower_leg}', 110.0, 0.0, TRUE,
 '{"instructions":["Hold dumbbells at sides","Step forward into lunge","Lower until back knee nearly touches floor","Push through front heel to return"],"tips":["Keep torso upright","Dumbbells provide natural counterbalance","Can do walking, reverse, or stationary"],"common_mistakes":["Leaning forward","Short stride","Knee going past toes excessively"]}'),

('Goblet Squat', 'Hold dumbbell or kettlebell at chest and squat to depth.', 'squat', 'dumbbell', 'beginner', FALSE, FALSE, '{upper_leg,lower_leg}', 120.0, 0.0, TRUE,
 '{"instructions":["Hold dumbbell vertically at chest with both hands","Squat down keeping chest up","Elbows track inside knees","Drive up to standing"],"tips":["Great for learning squat pattern","Counterbalance allows deeper squat","Keep elbows inside knees"],"common_mistakes":["Leaning too far forward","Not going deep enough","Letting knees cave in"]}')
ON CONFLICT DO NOTHING;

-- GYM MACHINE EXERCISES (12)
INSERT INTO exercises (name, description, movement_pattern, equipment, difficulty, is_bodyweight, is_unilateral, primary_segments_moved, rom_degrees, body_mass_fraction_moved, is_system_default, metadata) VALUES
('Leg Press', 'Push weighted platform away using legs while seated at 45 degrees.', 'squat', 'machine', 'beginner', FALSE, FALSE, '{upper_leg,lower_leg}', 110.0, 0.0, TRUE,
 '{"instructions":["Sit in leg press with back flat against pad","Place feet shoulder width on platform","Release safety and lower platform by bending knees","Press platform away to near full extension"],"tips":["Do not lock out knees completely","Adjust foot position for emphasis (high=glutes, low=quads)","Keep lower back pressed into pad"],"common_mistakes":["Locking knees at top","Letting hips roll off pad","Bouncing at bottom"]}'),

('Hack Squat Machine', 'Squat on angled sled machine with shoulders under pads.', 'squat', 'machine', 'intermediate', FALSE, FALSE, '{upper_leg,lower_leg}', 115.0, 0.0, TRUE,
 '{"instructions":["Position shoulders under pads, back against rest","Place feet shoulder width on platform","Release safety and lower by bending knees","Push up to starting position"],"tips":["Very quad dominant movement","Foot placement affects emphasis","Safer alternative to barbell squat"],"common_mistakes":["Knees caving inward","Not going deep enough","Placing feet too high or low"]}'),

('Smith Machine Squat', 'Squat using barbell fixed in guided vertical track.', 'squat', 'machine', 'beginner', FALSE, FALSE, '{upper_leg,lower_leg}', 115.0, 0.0, TRUE,
 '{"instructions":["Position bar on upper traps under smith machine","Feet slightly forward of bar","Unrack and squat to depth","Press up to start"],"tips":["Fixed bar path removes balance requirement","Can place feet forward for more glute emphasis","Built-in safety catches"],"common_mistakes":["Feet too far back (like free squat)","Not using full range of motion"]}'),

('Chest Press Machine', 'Push handles forward from chest level while seated in machine.', 'horizontal_push', 'machine', 'beginner', FALSE, FALSE, '{upper_arm,lower_arm}', 85.0, 0.0, TRUE,
 '{"instructions":["Adjust seat height so handles are at chest level","Grip handles and press forward","Extend arms fully","Return with control"],"tips":["Machine stabilizes the weight for you","Good for beginners or burnout sets","Adjust seat for optimal chest engagement"],"common_mistakes":["Seat too high or low","Not using full range of motion","Jerking the weight"]}'),

('Pec Deck (Fly Machine)', 'Bring pads or handles together in front of chest in a fly motion.', 'horizontal_push', 'machine', 'beginner', FALSE, FALSE, '{upper_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Sit with back flat against pad","Place forearms against pads or grip handles","Bring arms together in front of chest","Return with control"],"tips":["Isolates chest without tricep involvement","Maintain slight elbow bend","Squeeze chest at peak contraction"],"common_mistakes":["Using too much weight","Leaning forward","Not controlling the return"]}'),

('Shoulder Press Machine', 'Press handles overhead while seated in shoulder press machine.', 'vertical_push', 'machine', 'beginner', FALSE, FALSE, '{upper_arm,lower_arm}', 140.0, 0.0, TRUE,
 '{"instructions":["Adjust seat so handles start at shoulder height","Grip handles and press overhead","Extend arms fully","Lower with control"],"tips":["Safer than free weight overhead press","Good for building base strength","Keep back against pad"],"common_mistakes":["Arching back excessively","Not full range of motion","Using too much weight"]}'),

('Lat Pulldown', 'Pull bar down to chest from overhead cable attachment.', 'vertical_pull', 'machine', 'beginner', FALSE, FALSE, '{upper_arm,lower_arm}', 120.0, 0.0, TRUE,
 '{"instructions":["Grip bar wider than shoulder width","Sit with thighs secured under pads","Pull bar down to upper chest","Return with control"],"tips":["Lean back slightly","Squeeze shoulder blades together","Think about pulling elbows down"],"common_mistakes":["Pulling behind neck","Leaning too far back","Using momentum"]}'),

('Seated Row Machine', 'Pull handles toward torso while seated with chest against pad.', 'horizontal_pull', 'machine', 'beginner', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Sit with chest against pad","Grip handles with arms extended","Pull handles toward lower chest","Squeeze shoulder blades, return with control"],"tips":["Keep chest against pad throughout","Various grip options change emphasis","Full stretch at extension"],"common_mistakes":["Leaning back instead of pulling","Not fully extending","Using body momentum"]}'),

('Leg Extension', 'Extend lower legs against pad from seated position for quad isolation.', 'isolation_lower', 'machine', 'beginner', FALSE, FALSE, '{lower_leg}', 100.0, 0.0, TRUE,
 '{"instructions":["Sit with back against pad, adjust so pivot aligns with knee","Hook ankles under pad","Extend legs until straight","Lower with control"],"tips":["Pause at top for peak contraction","Do not hyperextend knees","Control the negative"],"common_mistakes":["Swinging the weight","Lifting hips off seat","Going too fast"]}'),

('Leg Curl (Seated)', 'Curl lower legs under pad from seated position for hamstring isolation.', 'isolation_lower', 'machine', 'beginner', FALSE, FALSE, '{lower_leg}', 100.0, 0.0, TRUE,
 '{"instructions":["Sit with back against pad, adjust so pivot aligns with knee","Position pad above ankles","Curl legs down and back","Return with control"],"tips":["Keep back pressed against pad","Focus on hamstring squeeze","Full range of motion"],"common_mistakes":["Using too much weight","Lifting off seat","Incomplete range of motion"]}'),

('Leg Curl (Lying)', 'Curl lower legs against pad while lying face down on machine.', 'isolation_lower', 'machine', 'beginner', FALSE, FALSE, '{lower_leg}', 100.0, 0.0, TRUE,
 '{"instructions":["Lie face down with ankles under pad","Curl legs up toward glutes","Squeeze at top","Lower with control"],"tips":["Keep hips pressed into pad","Point toes down for more hamstring activation","Avoid raising hips"],"common_mistakes":["Hips lifting off pad","Jerking the weight","Not full range of motion"]}'),

('Calf Raise Machine', 'Rise onto toes against resistance in standing or seated calf raise machine.', 'isolation_lower', 'machine', 'beginner', FALSE, FALSE, '{lower_leg}', 60.0, 0.0, TRUE,
 '{"instructions":["Position shoulders under pads (standing) or knees under pads (seated)","Place balls of feet on platform","Rise up onto toes as high as possible","Lower heels below platform for full stretch"],"tips":["Pause at top for peak contraction","Full stretch at bottom","Slow controlled reps work best"],"common_mistakes":["Bouncing at bottom","Partial range of motion","Going too fast"]}')
ON CONFLICT DO NOTHING;

-- CALISTHENICS / BODYWEIGHT EXERCISES (13)
INSERT INTO exercises (name, description, movement_pattern, equipment, difficulty, is_bodyweight, is_unilateral, primary_segments_moved, rom_degrees, body_mass_fraction_moved, is_system_default, metadata) VALUES
('Push-up (Standard)', 'Lower body to floor and press up with arms, body in plank position.', 'horizontal_push', 'bodyweight', 'beginner', TRUE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.64, TRUE,
 '{"instructions":["Start in plank position, hands shoulder width apart","Lower chest to floor bending elbows","Push up to full arm extension","Keep body straight throughout"],"tips":["Core engaged throughout","Elbows at about 45 degrees","Full range of motion"],"common_mistakes":["Sagging hips","Flaring elbows wide","Partial reps"]}'),

('Push-up (Diamond)', 'Push-up with hands close together forming diamond shape, emphasizes triceps.', 'horizontal_push', 'bodyweight', 'intermediate', TRUE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.64, TRUE,
 '{"instructions":["Place hands together under chest forming diamond with index fingers and thumbs","Perform push-up keeping elbows close to body","Lower until chest touches hands"],"tips":["Much harder than standard push-up","Excellent tricep builder","Keep elbows tucked"],"common_mistakes":["Hands too far forward","Flaring elbows","Not touching chest to hands"]}'),

('Push-up (Wide)', 'Push-up with hands placed wider than shoulders to emphasize chest.', 'horizontal_push', 'bodyweight', 'beginner', TRUE, FALSE, '{upper_arm,lower_arm}', 85.0, 0.64, TRUE,
 '{"instructions":["Place hands wider than shoulder width","Lower chest to floor","Press up to full extension"],"tips":["More chest focused than standard","Reduced range of motion","Good chest stretch at bottom"],"common_mistakes":["Going too wide (shoulder strain)","Sagging middle","Partial range of motion"]}'),

('Push-up (Decline)', 'Push-up with feet elevated on bench for increased difficulty and upper chest emphasis.', 'horizontal_push', 'bodyweight', 'intermediate', TRUE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.70, TRUE,
 '{"instructions":["Place feet on bench or elevated surface","Hands on floor, shoulder width apart","Lower chest toward floor","Press up to full extension"],"tips":["Higher elevation = more difficulty","Emphasizes upper chest and front delts","Core must work harder"],"common_mistakes":["Sagging hips","Insufficient depth","Feet slipping off surface"]}'),

('Pull-up (Overhand)', 'Hang from bar with overhand grip and pull chin above bar.', 'vertical_pull', 'bodyweight', 'intermediate', TRUE, FALSE, '{upper_arm,lower_arm}', 120.0, 0.95, TRUE,
 '{"instructions":["Grip bar with overhand grip, slightly wider than shoulders","From dead hang, pull body up until chin clears bar","Lower with control to dead hang"],"tips":["Initiate by depressing shoulder blades","Think about pulling elbows down","Full dead hang between reps"],"common_mistakes":["Kipping or swinging","Not going to full dead hang","Chin not clearing bar"]}'),

('Chin-up (Underhand)', 'Hang from bar with underhand grip and pull chin above bar, emphasizes biceps.', 'vertical_pull', 'bodyweight', 'intermediate', TRUE, FALSE, '{upper_arm,lower_arm}', 120.0, 0.95, TRUE,
 '{"instructions":["Grip bar with underhand (supinated) grip, shoulder width","Pull body up until chin clears bar","Lower with control"],"tips":["Easier than overhand pull-up for most people","Greater bicep activation","Full range of motion"],"common_mistakes":["Not full dead hang","Using momentum","Partial reps"]}'),

('Dips (Parallel Bars)', 'Lower body between parallel bars by bending arms, then press up.', 'vertical_push', 'bodyweight', 'intermediate', TRUE, FALSE, '{upper_arm,lower_arm}', 100.0, 0.90, TRUE,
 '{"instructions":["Grip parallel bars, arms straight, body suspended","Lower body by bending elbows to about 90 degrees","Press up to full arm extension"],"tips":["Lean forward for more chest, upright for more triceps","Control the descent","Full lockout at top"],"common_mistakes":["Going too deep (shoulder injury)","Swinging body","Partial range of motion"]}'),

('Dips (Bench)', 'Tricep dip using bench or chair behind body with feet on floor or elevated.', 'vertical_push', 'bodyweight', 'beginner', TRUE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.60, TRUE,
 '{"instructions":["Place hands on bench edge behind you, fingers forward","Extend legs forward (bent for easier, straight for harder)","Lower body by bending elbows to about 90 degrees","Press up to start"],"tips":["Keep back close to bench","Feet further away = harder","Good beginner dip variation"],"common_mistakes":["Elbows flaring outward","Going too deep","Shrugging shoulders"]}'),

('Muscle-up', 'Pull up then transition to above the bar and press up in one fluid motion.', 'bodyweight_compound', 'bodyweight', 'advanced', TRUE, FALSE, '{upper_arm,lower_arm,torso}', 180.0, 0.95, TRUE,
 '{"instructions":["Begin with a slight swing or strict from dead hang","Perform explosive pull-up","Transition wrists over bar at top of pull","Press up into dip position above bar"],"tips":["Requires strong pull-up and dip","False grip helps transition","Practice explosive pull-ups first"],"common_mistakes":["Insufficient pull height","Poor transition technique","Using too much kip"]}'),

('Pistol Squat', 'Single-leg squat with non-working leg extended forward.', 'squat', 'bodyweight', 'advanced', TRUE, TRUE, '{upper_leg,lower_leg}', 130.0, 0.85, TRUE,
 '{"instructions":["Stand on one leg, extend other leg forward","Squat down on standing leg to full depth","Keep non-working leg extended throughout","Stand back up"],"tips":["Requires excellent balance and mobility","Hold arms forward for counterbalance","Start with assisted version"],"common_mistakes":["Losing balance","Knee caving in","Not reaching full depth"]}'),

('Plank', 'Hold body in straight line on forearms and toes, isometric core exercise.', 'core', 'bodyweight', 'beginner', TRUE, FALSE, '{torso}', 0.0, 0.70, TRUE,
 '{"instructions":["Place forearms on floor, elbows under shoulders","Extend legs, balance on toes","Hold body in straight line from head to heels","Maintain position for target duration"],"tips":["Squeeze glutes and brace core","Do not let hips sag or pike","Breathe steadily throughout"],"common_mistakes":["Hips sagging","Hips piking up","Holding breath","Looking up (neck strain)"]}'),

('Side Plank', 'Hold body in straight line on one forearm and side of foot, lateral core stability.', 'core', 'bodyweight', 'beginner', TRUE, TRUE, '{torso}', 0.0, 0.50, TRUE,
 '{"instructions":["Lie on side, place forearm on floor under shoulder","Stack feet and lift hips off floor","Hold body in straight line from head to feet","Maintain for target duration, then switch sides"],"tips":["Squeeze obliques to maintain position","Stack or stagger feet","Free hand on hip or extended overhead"],"common_mistakes":["Hips dropping","Rolling forward or backward","Holding breath"]}'),

('Hanging Leg Raise', 'Hang from bar and raise legs to horizontal or above for core activation.', 'core', 'bodyweight', 'intermediate', TRUE, FALSE, '{upper_leg,torso}', 90.0, 0.35, TRUE,
 '{"instructions":["Hang from pull-up bar with arms extended","Raise legs together until parallel with floor or higher","Lower with control to starting position"],"tips":["Avoid swinging","For added difficulty, raise to bar","Bent knee version is easier progression"],"common_mistakes":["Swinging for momentum","Using hip flexors only","Partial range of motion"]}')
ON CONFLICT DO NOTHING;

-- CABLE EXERCISES (5)
INSERT INTO exercises (name, description, movement_pattern, equipment, difficulty, is_bodyweight, is_unilateral, primary_segments_moved, rom_degrees, body_mass_fraction_moved, is_system_default, metadata) VALUES
('Cable Crossover', 'Step between dual cable stacks and bring handles together in front of chest.', 'horizontal_push', 'cable', 'intermediate', FALSE, FALSE, '{upper_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Set pulleys to high position","Grip handles and step forward","With slight elbow bend, bring hands together in front of chest","Return with control"],"tips":["Constant tension throughout range of motion","Vary pulley height for different angles","Squeeze chest at peak contraction"],"common_mistakes":["Straightening arms","Using too much weight","Leaning too far forward"]}'),

('Cable Row (Seated)', 'Pull cable handle toward torso while seated with feet on platform.', 'horizontal_pull', 'cable', 'beginner', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Sit on bench with feet on platform, knees slightly bent","Grip handle with arms extended","Pull handle to lower chest/upper abdomen","Squeeze shoulder blades, return with control"],"tips":["Keep back straight, slight lean allowed","Various attachments change grip and emphasis","Full stretch at extension"],"common_mistakes":["Excessive body lean","Rounding back","Not full range of motion"]}'),

('Tricep Pushdown', 'Push cable attachment down from chest height to full arm extension for tricep isolation.', 'isolation_upper', 'cable', 'beginner', FALSE, FALSE, '{lower_arm}', 120.0, 0.0, TRUE,
 '{"instructions":["Set cable to high position, grip bar or rope attachment","Stand with elbows at sides, forearms at about 90 degrees","Push attachment down until arms are fully extended","Return with control"],"tips":["Keep elbows pinned to sides throughout","Rope allows more wrist rotation at bottom","Various attachments available"],"common_mistakes":["Elbows moving away from body","Leaning into the weight","Partial range of motion"]}'),

('Face Pull', 'Pull rope attachment to face level, rotating externally at the top.', 'horizontal_pull', 'cable', 'beginner', FALSE, FALSE, '{upper_arm,lower_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Set cable to upper chest or face height","Grip rope with overhand grip","Pull toward face, separating rope ends","Externally rotate arms at end position, return with control"],"tips":["Excellent for rear delts and rotator cuff health","Light weight, high reps works best","Keep elbows high"],"common_mistakes":["Using too much weight","Not rotating at end","Pulling too low"]}'),

('Cable Lateral Raise', 'Raise cable handle out to side to shoulder height for side deltoid isolation.', 'isolation_upper', 'cable', 'beginner', FALSE, TRUE, '{upper_arm}', 90.0, 0.0, TRUE,
 '{"instructions":["Set cable to lowest position, stand sideways to machine","Grip handle with far hand, arm across body","Raise arm out to side until parallel with floor","Lower with control"],"tips":["Constant tension throughout (advantage over dumbbells)","Slight bend in elbow","Can also be done with both arms using dual cables"],"common_mistakes":["Using too much weight","Shrugging shoulder","Leaning away from cable"]}')
ON CONFLICT DO NOTHING;

-- KETTLEBELL EXERCISES (5)
INSERT INTO exercises (name, description, movement_pattern, equipment, difficulty, is_bodyweight, is_unilateral, primary_segments_moved, rom_degrees, body_mass_fraction_moved, is_system_default, metadata) VALUES
('Kettlebell Swing', 'Hinge at hips to swing kettlebell between legs then drive hips forward to chest height.', 'hinge', 'kettlebell', 'intermediate', FALSE, FALSE, '{upper_leg,torso}', 90.0, 0.0, TRUE,
 '{"instructions":["Stand with feet wider than shoulders, kettlebell on floor ahead","Hinge and grip kettlebell, hike it back between legs","Drive hips forward explosively to swing KB to chest height","Let KB swing back between legs, repeat"],"tips":["Power comes from hips, not arms","Keep arms relaxed like ropes","Maintain neutral spine throughout"],"common_mistakes":["Squatting instead of hinging","Using arms to lift","Rounding back at bottom"]}'),

('Turkish Get-up', 'Rise from floor to standing position while holding kettlebell overhead with one arm.', 'bodyweight_compound', 'kettlebell', 'advanced', FALSE, TRUE, '{upper_arm,lower_arm,upper_leg,lower_leg,torso}', 180.0, 0.0, TRUE,
 '{"instructions":["Lie on back, press KB up with one arm","Roll to elbow, then to hand","Bridge hips up, sweep leg through to kneeling","Stand up from kneeling, reverse to return"],"tips":["Eyes on the kettlebell throughout","Each step is deliberate, not rushed","Start light to learn the pattern"],"common_mistakes":["Rushing through steps","Losing eye contact with KB","Bent pressing arm"]}'),

('Kettlebell Goblet Squat', 'Hold kettlebell by horns at chest and squat to depth.', 'squat', 'kettlebell', 'beginner', FALSE, FALSE, '{upper_leg,lower_leg}', 120.0, 0.0, TRUE,
 '{"instructions":["Hold kettlebell by horns at chest level","Squat down keeping chest up","Elbows track inside knees","Drive up to standing"],"tips":["Counterbalance allows deep squatting","Great for teaching squat form","Keep elbows inside knees for mobility"],"common_mistakes":["Rounding back","Not squatting deep enough","KB drifting away from body"]}'),

('Kettlebell Clean and Press', 'Clean kettlebell to rack position then press overhead in one flowing movement.', 'vertical_push', 'kettlebell', 'intermediate', FALSE, TRUE, '{upper_arm,lower_arm,upper_leg}', 150.0, 0.0, TRUE,
 '{"instructions":["Swing KB back between legs","Clean to rack position at shoulder","Press overhead to full lockout","Lower to rack, then back to swing"],"tips":["Clean is a hip-powered movement","Keep KB close to body during clean","Smooth transition from clean to press"],"common_mistakes":["KB banging forearm on clean","Pressing before stable rack","Using arm strength for clean"]}'),

('Kettlebell Snatch', 'Swing kettlebell from between legs to full overhead lockout in one motion.', 'bodyweight_compound', 'kettlebell', 'advanced', FALSE, TRUE, '{upper_arm,lower_arm,upper_leg,torso}', 180.0, 0.0, TRUE,
 '{"instructions":["Hinge and swing KB back between legs","Drive hips forward and pull KB overhead in one motion","Punch hand through at top to avoid KB flipping onto forearm","Lock out overhead, lower by guiding KB back down"],"tips":["Master the swing and clean before snatching","Tame the arc to keep KB close","Powerful hip drive is key"],"common_mistakes":["KB arcing too far from body","Forearm bruising from poor technique","Using arm pull instead of hip drive"]}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED: EXERCISE-MUSCLE MAPPINGS
-- ============================================================================

INSERT INTO exercise_muscles (exercise_id, muscle_group_id, involvement, activation_fraction)
SELECT e.id, mg.id, m.involvement, m.activation
FROM (VALUES
    -- BARBELL BENCH PRESS (FLAT)
    ('Barbell Bench Press (Flat)', 'chest',         'primary',   1.0),
    ('Barbell Bench Press (Flat)', 'front_deltoid',  'secondary', 0.6),
    ('Barbell Bench Press (Flat)', 'triceps',        'secondary', 0.7),

    -- BARBELL BENCH PRESS (INCLINE)
    ('Barbell Bench Press (Incline)', 'chest',         'primary',   0.8),
    ('Barbell Bench Press (Incline)', 'front_deltoid',  'primary',   0.8),
    ('Barbell Bench Press (Incline)', 'triceps',        'secondary', 0.7),

    -- BARBELL BENCH PRESS (DECLINE)
    ('Barbell Bench Press (Decline)', 'chest',         'primary',   1.0),
    ('Barbell Bench Press (Decline)', 'front_deltoid',  'secondary', 0.4),
    ('Barbell Bench Press (Decline)', 'triceps',        'secondary', 0.7),

    -- BACK SQUAT
    ('Back Squat', 'quadriceps', 'primary',   1.0),
    ('Back Squat', 'glutes',     'primary',   0.9),
    ('Back Squat', 'hamstrings', 'secondary', 0.5),
    ('Back Squat', 'lower_back', 'stabilizer',0.4),
    ('Back Squat', 'abs',        'stabilizer',0.3),

    -- FRONT SQUAT
    ('Front Squat', 'quadriceps', 'primary',   1.0),
    ('Front Squat', 'glutes',     'secondary', 0.6),
    ('Front Squat', 'abs',        'stabilizer',0.5),
    ('Front Squat', 'upper_back', 'stabilizer',0.4),

    -- DEADLIFT (CONVENTIONAL)
    ('Deadlift (Conventional)', 'glutes',     'primary',   1.0),
    ('Deadlift (Conventional)', 'hamstrings', 'primary',   0.9),
    ('Deadlift (Conventional)', 'lower_back', 'primary',   0.9),
    ('Deadlift (Conventional)', 'quadriceps', 'secondary', 0.6),
    ('Deadlift (Conventional)', 'upper_back', 'stabilizer',0.5),
    ('Deadlift (Conventional)', 'forearms',   'stabilizer',0.5),

    -- DEADLIFT (SUMO)
    ('Deadlift (Sumo)', 'quadriceps',  'primary',   0.8),
    ('Deadlift (Sumo)', 'glutes',      'primary',   1.0),
    ('Deadlift (Sumo)', 'hamstrings',  'secondary', 0.6),
    ('Deadlift (Sumo)', 'lower_back',  'secondary', 0.7),
    ('Deadlift (Sumo)', 'hip_flexors', 'secondary', 0.4),

    -- ROMANIAN DEADLIFT
    ('Romanian Deadlift', 'hamstrings', 'primary',   1.0),
    ('Romanian Deadlift', 'glutes',     'primary',   0.8),
    ('Romanian Deadlift', 'lower_back', 'secondary', 0.7),

    -- OVERHEAD PRESS
    ('Overhead Press', 'front_deltoid', 'primary',   1.0),
    ('Overhead Press', 'side_deltoid',  'secondary', 0.7),
    ('Overhead Press', 'triceps',       'secondary', 0.8),
    ('Overhead Press', 'upper_back',    'stabilizer',0.3),

    -- BARBELL ROW
    ('Barbell Row (Bent-Over)', 'lats',         'primary',   1.0),
    ('Barbell Row (Bent-Over)', 'upper_back',   'primary',   0.8),
    ('Barbell Row (Bent-Over)', 'biceps',       'secondary', 0.7),
    ('Barbell Row (Bent-Over)', 'rear_deltoid', 'secondary', 0.5),
    ('Barbell Row (Bent-Over)', 'lower_back',   'stabilizer',0.4),

    -- BARBELL CURL
    ('Barbell Curl', 'biceps',   'primary',   1.0),
    ('Barbell Curl', 'forearms', 'secondary', 0.5),

    -- BARBELL LUNGE
    ('Barbell Lunge', 'quadriceps', 'primary',   1.0),
    ('Barbell Lunge', 'glutes',     'primary',   0.8),
    ('Barbell Lunge', 'hamstrings', 'secondary', 0.5),

    -- DUMBBELL BENCH PRESS (FLAT)
    ('Dumbbell Bench Press (Flat)', 'chest',         'primary',   1.0),
    ('Dumbbell Bench Press (Flat)', 'front_deltoid',  'secondary', 0.6),
    ('Dumbbell Bench Press (Flat)', 'triceps',        'secondary', 0.7),

    -- DUMBBELL BENCH PRESS (INCLINE)
    ('Dumbbell Bench Press (Incline)', 'chest',         'primary',   0.8),
    ('Dumbbell Bench Press (Incline)', 'front_deltoid',  'primary',   0.8),
    ('Dumbbell Bench Press (Incline)', 'triceps',        'secondary', 0.7),

    -- DUMBBELL ROW
    ('Dumbbell Row (Single-Arm)', 'lats',         'primary',   1.0),
    ('Dumbbell Row (Single-Arm)', 'upper_back',   'secondary', 0.7),
    ('Dumbbell Row (Single-Arm)', 'biceps',       'secondary', 0.6),
    ('Dumbbell Row (Single-Arm)', 'rear_deltoid', 'secondary', 0.4),

    -- DUMBBELL SHOULDER PRESS
    ('Dumbbell Shoulder Press', 'front_deltoid', 'primary',   1.0),
    ('Dumbbell Shoulder Press', 'side_deltoid',  'secondary', 0.6),
    ('Dumbbell Shoulder Press', 'triceps',       'secondary', 0.7),

    -- DUMBBELL CURL
    ('Dumbbell Curl', 'biceps',   'primary',   1.0),
    ('Dumbbell Curl', 'forearms', 'secondary', 0.4),

    -- DUMBBELL HAMMER CURL
    ('Dumbbell Hammer Curl', 'biceps',   'primary',   0.8),
    ('Dumbbell Hammer Curl', 'forearms', 'primary',   0.7),

    -- DUMBBELL LATERAL RAISE
    ('Dumbbell Lateral Raise', 'side_deltoid',  'primary',   1.0),
    ('Dumbbell Lateral Raise', 'front_deltoid', 'secondary', 0.3),

    -- DUMBBELL FLY
    ('Dumbbell Fly', 'chest',         'primary',   1.0),
    ('Dumbbell Fly', 'front_deltoid', 'secondary', 0.4),

    -- DUMBBELL LUNGE
    ('Dumbbell Lunge', 'quadriceps', 'primary',   1.0),
    ('Dumbbell Lunge', 'glutes',     'primary',   0.8),
    ('Dumbbell Lunge', 'hamstrings', 'secondary', 0.5),

    -- GOBLET SQUAT
    ('Goblet Squat', 'quadriceps', 'primary',   1.0),
    ('Goblet Squat', 'glutes',     'primary',   0.8),
    ('Goblet Squat', 'abs',        'stabilizer',0.4),

    -- LEG PRESS
    ('Leg Press', 'quadriceps', 'primary',   1.0),
    ('Leg Press', 'glutes',     'secondary', 0.7),
    ('Leg Press', 'hamstrings', 'secondary', 0.4),

    -- HACK SQUAT
    ('Hack Squat Machine', 'quadriceps', 'primary',   1.0),
    ('Hack Squat Machine', 'glutes',     'secondary', 0.6),

    -- SMITH MACHINE SQUAT
    ('Smith Machine Squat', 'quadriceps', 'primary',   1.0),
    ('Smith Machine Squat', 'glutes',     'primary',   0.8),
    ('Smith Machine Squat', 'hamstrings', 'secondary', 0.4),

    -- CHEST PRESS MACHINE
    ('Chest Press Machine', 'chest',         'primary',   1.0),
    ('Chest Press Machine', 'front_deltoid', 'secondary', 0.5),
    ('Chest Press Machine', 'triceps',       'secondary', 0.6),

    -- PEC DECK
    ('Pec Deck (Fly Machine)', 'chest',         'primary',   1.0),
    ('Pec Deck (Fly Machine)', 'front_deltoid', 'secondary', 0.3),

    -- SHOULDER PRESS MACHINE
    ('Shoulder Press Machine', 'front_deltoid', 'primary',   1.0),
    ('Shoulder Press Machine', 'side_deltoid',  'secondary', 0.6),
    ('Shoulder Press Machine', 'triceps',       'secondary', 0.7),

    -- LAT PULLDOWN
    ('Lat Pulldown', 'lats',       'primary',   1.0),
    ('Lat Pulldown', 'biceps',     'secondary', 0.7),
    ('Lat Pulldown', 'upper_back', 'secondary', 0.5),

    -- SEATED ROW MACHINE
    ('Seated Row Machine', 'lats',         'primary',   0.9),
    ('Seated Row Machine', 'upper_back',   'primary',   0.8),
    ('Seated Row Machine', 'biceps',       'secondary', 0.6),
    ('Seated Row Machine', 'rear_deltoid', 'secondary', 0.4),

    -- LEG EXTENSION
    ('Leg Extension', 'quadriceps', 'primary', 1.0),

    -- LEG CURL (SEATED)
    ('Leg Curl (Seated)', 'hamstrings', 'primary', 1.0),
    ('Leg Curl (Seated)', 'calves',     'secondary', 0.2),

    -- LEG CURL (LYING)
    ('Leg Curl (Lying)', 'hamstrings', 'primary', 1.0),
    ('Leg Curl (Lying)', 'calves',     'secondary', 0.2),

    -- CALF RAISE
    ('Calf Raise Machine', 'calves', 'primary', 1.0),

    -- PUSH-UP (STANDARD)
    ('Push-up (Standard)', 'chest',         'primary',   0.9),
    ('Push-up (Standard)', 'front_deltoid', 'secondary', 0.6),
    ('Push-up (Standard)', 'triceps',       'secondary', 0.7),
    ('Push-up (Standard)', 'abs',           'stabilizer',0.3),

    -- PUSH-UP (DIAMOND)
    ('Push-up (Diamond)', 'triceps',       'primary',   1.0),
    ('Push-up (Diamond)', 'chest',         'secondary', 0.7),
    ('Push-up (Diamond)', 'front_deltoid', 'secondary', 0.5),

    -- PUSH-UP (WIDE)
    ('Push-up (Wide)', 'chest',         'primary',   1.0),
    ('Push-up (Wide)', 'front_deltoid', 'secondary', 0.5),
    ('Push-up (Wide)', 'triceps',       'secondary', 0.5),

    -- PUSH-UP (DECLINE)
    ('Push-up (Decline)', 'chest',         'primary',   0.9),
    ('Push-up (Decline)', 'front_deltoid', 'primary',   0.7),
    ('Push-up (Decline)', 'triceps',       'secondary', 0.7),

    -- PULL-UP (OVERHAND)
    ('Pull-up (Overhand)', 'lats',       'primary',   1.0),
    ('Pull-up (Overhand)', 'biceps',     'secondary', 0.7),
    ('Pull-up (Overhand)', 'upper_back', 'secondary', 0.6),
    ('Pull-up (Overhand)', 'forearms',   'stabilizer',0.4),

    -- CHIN-UP (UNDERHAND)
    ('Chin-up (Underhand)', 'lats',       'primary',   0.9),
    ('Chin-up (Underhand)', 'biceps',     'primary',   0.8),
    ('Chin-up (Underhand)', 'upper_back', 'secondary', 0.5),

    -- DIPS (PARALLEL BARS)
    ('Dips (Parallel Bars)', 'triceps',       'primary',   1.0),
    ('Dips (Parallel Bars)', 'chest',         'primary',   0.8),
    ('Dips (Parallel Bars)', 'front_deltoid', 'secondary', 0.5),

    -- DIPS (BENCH)
    ('Dips (Bench)', 'triceps',       'primary',   1.0),
    ('Dips (Bench)', 'front_deltoid', 'secondary', 0.4),
    ('Dips (Bench)', 'chest',         'secondary', 0.3),

    -- MUSCLE-UP
    ('Muscle-up', 'lats',         'primary',   1.0),
    ('Muscle-up', 'triceps',      'primary',   0.8),
    ('Muscle-up', 'chest',        'secondary', 0.6),
    ('Muscle-up', 'biceps',       'secondary', 0.6),
    ('Muscle-up', 'front_deltoid','secondary', 0.5),
    ('Muscle-up', 'abs',          'stabilizer',0.4),

    -- PISTOL SQUAT
    ('Pistol Squat', 'quadriceps',  'primary',   1.0),
    ('Pistol Squat', 'glutes',      'primary',   0.9),
    ('Pistol Squat', 'hamstrings',  'secondary', 0.5),
    ('Pistol Squat', 'hip_flexors', 'secondary', 0.4),
    ('Pistol Squat', 'abs',         'stabilizer',0.4),

    -- PLANK
    ('Plank', 'abs',        'primary',   1.0),
    ('Plank', 'obliques',   'secondary', 0.6),
    ('Plank', 'lower_back', 'stabilizer',0.4),

    -- SIDE PLANK
    ('Side Plank', 'obliques',   'primary',   1.0),
    ('Side Plank', 'abs',        'secondary', 0.5),
    ('Side Plank', 'hip_flexors','stabilizer',0.3),

    -- HANGING LEG RAISE
    ('Hanging Leg Raise', 'abs',         'primary',   1.0),
    ('Hanging Leg Raise', 'hip_flexors', 'primary',   0.8),
    ('Hanging Leg Raise', 'obliques',    'secondary', 0.4),
    ('Hanging Leg Raise', 'forearms',    'stabilizer',0.3),

    -- CABLE CROSSOVER
    ('Cable Crossover', 'chest',         'primary',   1.0),
    ('Cable Crossover', 'front_deltoid', 'secondary', 0.4),

    -- CABLE ROW (SEATED)
    ('Cable Row (Seated)', 'lats',         'primary',   0.9),
    ('Cable Row (Seated)', 'upper_back',   'primary',   0.8),
    ('Cable Row (Seated)', 'biceps',       'secondary', 0.6),
    ('Cable Row (Seated)', 'rear_deltoid', 'secondary', 0.4),

    -- TRICEP PUSHDOWN
    ('Tricep Pushdown', 'triceps', 'primary', 1.0),

    -- FACE PULL
    ('Face Pull', 'rear_deltoid', 'primary',   1.0),
    ('Face Pull', 'upper_back',   'secondary', 0.6),

    -- CABLE LATERAL RAISE
    ('Cable Lateral Raise', 'side_deltoid',  'primary',   1.0),
    ('Cable Lateral Raise', 'front_deltoid', 'secondary', 0.3),

    -- KETTLEBELL SWING
    ('Kettlebell Swing', 'glutes',     'primary',   1.0),
    ('Kettlebell Swing', 'hamstrings', 'primary',   0.8),
    ('Kettlebell Swing', 'lower_back', 'secondary', 0.6),
    ('Kettlebell Swing', 'abs',        'stabilizer',0.4),
    ('Kettlebell Swing', 'forearms',   'stabilizer',0.3),

    -- TURKISH GET-UP
    ('Turkish Get-up', 'abs',          'primary',   0.8),
    ('Turkish Get-up', 'front_deltoid','primary',   0.7),
    ('Turkish Get-up', 'glutes',       'secondary', 0.6),
    ('Turkish Get-up', 'quadriceps',   'secondary', 0.5),
    ('Turkish Get-up', 'obliques',     'secondary', 0.5),

    -- KETTLEBELL GOBLET SQUAT
    ('Kettlebell Goblet Squat', 'quadriceps', 'primary',   1.0),
    ('Kettlebell Goblet Squat', 'glutes',     'primary',   0.8),
    ('Kettlebell Goblet Squat', 'abs',        'stabilizer',0.4),

    -- KETTLEBELL CLEAN AND PRESS
    ('Kettlebell Clean and Press', 'front_deltoid', 'primary',   0.9),
    ('Kettlebell Clean and Press', 'triceps',       'secondary', 0.6),
    ('Kettlebell Clean and Press', 'glutes',        'secondary', 0.5),
    ('Kettlebell Clean and Press', 'forearms',      'secondary', 0.5),

    -- KETTLEBELL SNATCH
    ('Kettlebell Snatch', 'glutes',        'primary',   0.9),
    ('Kettlebell Snatch', 'hamstrings',    'primary',   0.7),
    ('Kettlebell Snatch', 'front_deltoid', 'secondary', 0.6),
    ('Kettlebell Snatch', 'upper_back',    'secondary', 0.5),
    ('Kettlebell Snatch', 'abs',           'stabilizer',0.4),
    ('Kettlebell Snatch', 'forearms',      'stabilizer',0.4)
) AS m(exercise_name, muscle_name, involvement, activation)
JOIN exercises e ON e.name = m.exercise_name AND e.is_system_default = TRUE
JOIN muscle_groups mg ON mg.name = m.muscle_name
ON CONFLICT (exercise_id, muscle_group_id) DO NOTHING;
