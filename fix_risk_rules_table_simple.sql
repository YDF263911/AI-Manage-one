-- Fix risk_rules table structure to match frontend code
DROP TABLE IF EXISTS risk_rules CASCADE;

CREATE TABLE risk_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('legal', 'financial', 'operational', 'format', 'custom')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    pattern_type VARCHAR(20) NOT NULL CHECK (pattern_type IN ('keyword', 'regex', 'semantic', 'logic')),
    pattern_content TEXT,
    threshold DECIMAL(3,2) DEFAULT 0.8,
    condition JSONB,
    suggestion TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_rules_category ON risk_rules(category);
CREATE INDEX idx_risk_rules_severity ON risk_rules(severity);
CREATE INDEX idx_risk_rules_active ON risk_rules(is_active);
CREATE INDEX idx_risk_rules_created_at ON risk_rules(created_at DESC);