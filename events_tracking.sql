CREATE TABLE site_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- optional, if you track logged-in users
    session_id UUID, -- unique identifier for the user's session
    event_type TEXT NOT NULL, -- e.g., 'page_view', 'click', 'visit'
    page_url TEXT NOT NULL, -- the URL where the event occurred
    referrer_url TEXT, -- where the user came from
    browser_info JSONB, -- store details about the user's browser
    ip_address INET, -- user's IP address
    timestamp TIMESTAMPTZ DEFAULT now(), -- when the event occurred
    metadata JSONB -- optional, additional event-specific details
);

CREATE TABLE project_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE, -- link to the project
    user_id UUID REFERENCES auth.users(id), -- optional, if you track logged-in users
    session_id UUID, -- unique identifier for the user's session
    event_type TEXT NOT NULL DEFAULT 'page_view', -- event type, e.g., 'page_view'
    page_url TEXT NOT NULL, -- the URL of the project page
    referrer_url TEXT, -- where the user came from
    browser_info JSONB, -- store details about the user's browser
    ip_address INET, -- user's IP address
    timestamp TIMESTAMPTZ DEFAULT now(), -- when the event occurred
    metadata JSONB -- optional, additional details (e.g., project-specific context)
);

CREATE TABLE event_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL, -- link to either site or project event
    event_type TEXT NOT NULL CHECK (event_type IN ('site_event', 'project_event')), -- determines event type
    key TEXT NOT NULL, -- metadata key
    value TEXT NOT NULL, -- metadata value
    created_at TIMESTAMPTZ DEFAULT now()
);



