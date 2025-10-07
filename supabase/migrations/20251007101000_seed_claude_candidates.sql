DO $$
DECLARE
  rows_to_insert CONSTANT TEXT[] := ARRAY[
    'claude_example1|https://www.example-property1.com|example-property1.com|1',
    'claude_example2|https://www.example-property2.com|example-property2.com|1',
    'elora_at_buckhead|https://www.apartments.com/atlanta-ga/elora-at-buckhead/123456|apartments.com|2'
  ];
  has_metadata BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata');
  has_priority BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority');
  has_property_cols BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'property_id')
                        AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'unit_number');
  parts TEXT[];
  v_external_id TEXT;
  v_url TEXT;
  v_website TEXT;
  v_priority INT;
  sql TEXT;
BEGIN
  FOREACH sql IN ARRAY rows_to_insert LOOP
    parts := string_to_array(sql, '|');
    v_external_id := parts[1];
    v_url := parts[2];
    v_website := parts[3];
    v_priority := parts[4]::int;

    IF NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = v_external_id) THEN
      IF has_metadata THEN
        IF has_property_cols THEN
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, property_id, unit_number, url, source, status, metadata, created_at)
            VALUES (%L, %L, %L, %L, %L, 'queued', json_build_object('priority', %s, 'website', %L)::jsonb, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_external_id, '', v_url, v_website, v_priority, v_website);
        ELSE
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, url, source, status, metadata, created_at)
            VALUES (%L, %L, %L, 'queued', json_build_object('priority', %s, 'website', %L)::jsonb, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_url, v_website, v_priority, v_website);
        END IF;
        EXECUTE sql;
      ELSIF has_priority THEN
        IF has_property_cols THEN
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, property_id, unit_number, url, source, status, priority, created_at)
            VALUES (%L, %L, %L, %L, %L, 'queued', %s, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_external_id, '', v_url, v_website, v_priority);
        ELSE
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, url, source, status, priority, created_at)
            VALUES (%L, %L, %L, 'queued', %s, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_url, v_website, v_priority);
        END IF;
        EXECUTE sql;
      ELSE
        IF has_property_cols THEN
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, property_id, unit_number, url, source, status, created_at)
            VALUES (%L, %L, %L, %L, %L, 'queued', NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_external_id, '', v_url, v_website);
        ELSE
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
            VALUES (%L, %L, %L, 'queued', NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_url, v_website);
        END IF;
        EXECUTE sql;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
