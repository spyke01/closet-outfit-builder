BEGIN;
-- A user's newer clothing/photo edit cancels an older worker's association.
-- Provider work may already have incurred a cost; the job reservation remains.
CREATE FUNCTION public.keep_newer_clothing_choice() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF current_user='authenticated' AND NEW.image_processing_job_id IS NOT DISTINCT FROM OLD.image_processing_job_id
 AND ROW(NEW.name,NEW.color,NEW.brand,NEW.material,NEW.category_id,NEW.image_url) IS DISTINCT FROM ROW(OLD.name,OLD.color,OLD.brand,OLD.material,OLD.category_id,OLD.image_url)
 THEN NEW.image_processing_job_id:=NULL; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER keep_newer_clothing_choice BEFORE UPDATE ON public.wardrobe_items FOR EACH ROW EXECUTE FUNCTION public.keep_newer_clothing_choice();
COMMIT;
