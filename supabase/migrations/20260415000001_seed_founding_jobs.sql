-- Seed the two launch jobs for the Founding 100 portal

INSERT INTO public.founding_jobs (title, description, type, points, schema) VALUES

(
  'Your Shower Routine',
  'Before the kit arrives, tell us exactly where you''re starting from. This is the baseline everything else gets measured against.',
  'survey',
  2,
  '[
    {
      "id": "products",
      "type": "checkboxes",
      "label": "What do you currently use on your body in the shower?",
      "options": ["Shower gel", "Bar soap", "Body scrub / exfoliator", "Body oil", "Nothing specific", "Body lotion / moisturiser after"],
      "other": true,
      "required": true
    },
    {
      "id": "back",
      "type": "radio",
      "label": "What do you currently do for your back?",
      "options": ["Nothing at all", "Try to reach with a cloth", "Long-handled brush or sponge", "Ask someone else", "Use a back scrubber"],
      "other": true,
      "required": true
    },
    {
      "id": "duration",
      "type": "radio",
      "label": "How long does your shower typically take?",
      "options": ["Under 5 minutes", "5–10 minutes", "10–15 minutes", "15+ minutes"],
      "required": true
    },
    {
      "id": "should_do",
      "type": "text",
      "label": "The one thing you know you should do for your body but don''t.",
      "placeholder": "Be honest — that''s what helps us most.",
      "required": true
    },
    {
      "id": "anything_else",
      "type": "text",
      "label": "Anything else about your current routine?",
      "placeholder": "Optional.",
      "required": false
    }
  ]'::jsonb
),

(
  'Why SOLUM',
  'Your words here will shape how we talk to the next 10,000 people. Tell us why you signed up and what you expect.',
  'survey',
  2,
  '[
    {
      "id": "reason",
      "type": "checkboxes",
      "label": "What made you sign up? Select everything that applies.",
      "options": ["The back problem — finally addressed", "The Korean technique", "The full system approach", "The ingredients and formulas", "The brand aesthetic", "Saw it on Instagram", "Referred by someone"],
      "other": true,
      "required": true
    },
    {
      "id": "product",
      "type": "radio",
      "label": "Which product are you most curious about?",
      "options": ["01 — Body Wash", "02 — Exfoliating Mitt", "03 — Back Scrub Cloth", "04 — Scalp Massager", "05 — Rhassoul Clay Mask", "06 — Argan Body Oil", "07 — Body Lotion"],
      "required": true
    },
    {
      "id": "expectation",
      "type": "text",
      "label": "What do you expect to be different after 30 days with the kit?",
      "placeholder": "Your words here. Don''t hold back.",
      "required": true
    },
    {
      "id": "anything_else",
      "type": "text",
      "label": "Anything else you want us to know?",
      "placeholder": "Optional.",
      "required": false
    }
  ]'::jsonb
);
