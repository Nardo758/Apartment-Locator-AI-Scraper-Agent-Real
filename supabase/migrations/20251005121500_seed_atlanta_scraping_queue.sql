
DO $$
DECLARE
  r_text TEXT;
  rows_to_insert CONSTANT TEXT[] := ARRAY[
    'amli_arts_center|https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center|amli',
    'amli_midtown|https://www.amli.com/apartments/atlanta/midtown-apartments|amli',
    'atlantic_house|https://atlantichousemidtown.com|atlantic',
    'novel_midtown_atlanta|https://novelmidtownatl.com|novel',
    'sentral_west_midtown|https://sentral.com/atlanta/west-midtown|sentral',
    'windsor_at_midtown|https://www.windsoratmidtown.com|windsor',
    'broadstone_2thirty|https://www.broadstone2thirty.com|broadstone',
    'centennial_place|https://www.centennialplaceapts.com|centennial',
    'grace_residences|https://www.thegraceresidences.com|grace',
    'standard_atlanta|https://www.thestandardatl.com|standard',
    'vue_midtown|https://www.vuemidtown.com|vue',
    'novel_west_midtown|https://www.novelwestmidtown.com|novel',
    'porter_westside|https://www.porterwestside.com|porter',
    'exchange_west_end|https://www.exchangewestend.com|exchange',
    'cortland_brookhaven|https://cortland.com/apartments/atlanta-metro/cortland-brookhaven|cortland',
    'maa_brookhaven|https://www.maac.com/georgia/atlanta/maa-brookhaven|maa',
    'post_brookhaven|https://www.postbrookhaven.com|post',
    'reserve_brookhaven|https://www.reservebrookhaven.com|reserve',
    'maa_milstead|https://www.maac.com/georgia/atlanta/maa-milstead/|maa',
    'highlands_sweetwater|https://highlandsatsweetwatercreek.com/|highlands'
  ];
  has_metadata BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata');
  has_priority BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority');
  has_property_cols BOOLEAN := EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'property_id')
                        AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'unit_number');
  parts TEXT[];
  v_external_id TEXT;
  v_url TEXT;
  v_source TEXT;
  sql TEXT;
BEGIN
  FOREACH r_text IN ARRAY rows_to_insert LOOP
    parts := string_to_array(r_text, '|');
    v_external_id := parts[1];
    v_url := parts[2];
    v_source := parts[3];

    -- Insert only when not present
    IF NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = v_external_id) THEN
      IF has_metadata THEN
        IF has_property_cols THEN
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, property_id, unit_number, url, source, status, metadata, created_at)
            VALUES (%L, %L, %L, %L, %L, 'queued', json_build_object('priority', 1)::jsonb, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_external_id, '', v_url, v_source);
        ELSE
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, url, source, status, metadata, created_at)
            VALUES (%L, %L, %L, 'queued', json_build_object('priority', 1)::jsonb, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_url, v_source);
        END IF;
        EXECUTE sql;
      ELSIF has_priority THEN
        IF has_property_cols THEN
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, property_id, unit_number, url, source, status, priority, created_at)
            VALUES (%L, %L, %L, %L, %L, 'queued', 1, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_external_id, '', v_url, v_source);
        ELSE
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, url, source, status, priority, created_at)
            VALUES (%L, %L, %L, 'queued', 1, NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_url, v_source);
        END IF;
        EXECUTE sql;
      ELSE
        IF has_property_cols THEN
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, property_id, unit_number, url, source, status, created_at)
            VALUES (%L, %L, %L, %L, %L, 'queued', NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_external_id, '', v_url, v_source);
        ELSE
          sql := format($f$
            INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
            VALUES (%L, %L, %L, 'queued', NOW())
            ON CONFLICT DO NOTHING
          $f$, v_external_id, v_url, v_source);
        END IF;
        EXECUTE sql;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'atlantic_house','https://atlantichousemidtown.com','atlantic','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'atlantic_house')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'novel_midtown_atlanta','https://novelmidtownatl.com','novel','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'novel_midtown_atlanta')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'sentral_west_midtown','https://sentral.com/atlanta/west-midtown','sentral','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'sentral_west_midtown')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'windsor_at_midtown','https://www.windsoratmidtown.com','windsor','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'windsor_at_midtown')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'broadstone_2thirty','https://www.broadstone2thirty.com','broadstone','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'broadstone_2thirty')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'centennial_place','https://www.centennialplaceapts.com','centennial','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'centennial_place')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'grace_residences','https://www.thegraceresidences.com','grace','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'grace_residences')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'standard_atlanta','https://www.thestandardatl.com','standard','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'standard_atlanta')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'vue_midtown','https://www.vuemidtown.com','vue','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'vue_midtown')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'novel_west_midtown','https://www.novelwestmidtown.com','novel','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'novel_west_midtown')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'porter_westside','https://www.porterwestside.com','porter','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'porter_westside')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'exchange_west_end','https://www.exchangewestend.com','exchange','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'exchange_west_end')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'cortland_brookhaven','https://cortland.com/apartments/atlanta-metro/cortland-brookhaven','cortland','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'cortland_brookhaven')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'maa_brookhaven','https://www.maac.com/georgia/atlanta/maa-brookhaven','maa','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'maa_brookhaven')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'post_brookhaven','https://www.postbrookhaven.com','post','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'post_brookhaven')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'reserve_brookhaven','https://www.reservebrookhaven.com','reserve','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'reserve_brookhaven')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'maa_milstead','https://www.maac.com/georgia/atlanta/maa-milstead/','maa','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'maa_milstead')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

INSERT INTO public.scraping_queue (external_id, url, source, status, created_at)
SELECT 'highlands_sweetwater','https://highlandsatsweetwatercreek.com/','highlands','queued', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.scraping_queue WHERE external_id = 'highlands_sweetwater')
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'metadata'))
  AND NOT (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'scraping_queue' AND column_name = 'priority'));

