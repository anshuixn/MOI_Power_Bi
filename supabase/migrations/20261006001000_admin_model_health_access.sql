BEGIN;

REVOKE ALL ON FUNCTION public.get_model_health(uuid, integer)
    FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_model_health(
    p_organization_id uuid,
    p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL
       OR NOT app_private.is_org_admin(p_organization_id) THEN
        RAISE EXCEPTION 'Administrator access denied' USING ERRCODE = '42501';
    END IF;

    RETURN public.get_model_health(p_organization_id, p_days);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_model_health(uuid, integer)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_model_health(uuid, integer)
    TO authenticated;

DO $$
BEGIN
    IF has_function_privilege(
        'authenticated', 'public.get_model_health(uuid,integer)', 'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'Direct member access to model health must be revoked';
    END IF;

    IF NOT has_function_privilege(
        'authenticated', 'public.get_admin_model_health(uuid,integer)', 'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'Administrator model health RPC is not executable';
    END IF;

    IF has_function_privilege(
        'anon', 'public.get_admin_model_health(uuid,integer)', 'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'Anonymous model health access must be revoked';
    END IF;
END;
$$;

COMMIT;
