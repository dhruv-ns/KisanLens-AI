import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useFarm } from '../contexts/FarmContext';
import { weatherApi } from '../services/api';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CROPS = ['Tomato', 'Potato', 'Rice', 'Wheat', 'Onion', 'Cotton', 'Maize', 'Sugarcane', 'Soybean', 'Other'];
const STAGES = ['sowing', 'germination', 'vegetative', 'flowering', 'fruiting', 'harvesting', 'post-harvest'];

export default function FarmProfile() {
  const { t, language } = useLanguage();
  const { farm, saveFarm, loading } = useFarm();

  const [form, setForm] = useState({
    farmName: farm?.farmName || '',
    crop: farm?.crop || '',
    cropStage: farm?.cropStage || '',
    area: farm?.area || '',
    areaUnit: farm?.areaUnit || 'acres',
    location: { city: farm?.location?.city || '', state: farm?.location?.state || '' },
    soilType: farm?.soilType || '',
  });

  // Sync form when farm profile loads or updates in context
  useEffect(() => {
    if (farm) {
      setForm({
        farmName: farm.farmName || '',
        crop: farm.crop || '',
        cropStage: farm.cropStage || '',
        area: farm.area || '',
        areaUnit: farm.areaUnit || 'acres',
        location: {
          city: farm.location?.city || '',
          state: farm.location?.state || '',
        },
        soilType: farm.soilType || '',
      });
    }
  }, [farm]);

  const handleSave = async () => {
    let lat = farm?.latitude;
    let lon = farm?.longitude;

    // Automatically resolve coordinates for user's city if missing
    if (form.location.city && (!lat || !lon)) {
      try {
        const geoRes = await weatherApi.searchLocation(form.location.city);
        if (geoRes?.data && geoRes.data.length > 0) {
          lat = geoRes.data[0].latitude;
          lon = geoRes.data[0].longitude;
        }
      } catch (e) {
        // Continue saving even if geocoding times out
      }
    }

    await saveFarm({
      ...form,
      area: parseFloat(form.area as any) || 0,
      latitude: lat,
      longitude: lon,
    });
    toast.success(t('farm.saved'));
  };

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const getCropLabel = (crop: string) => {
    const key = `scanner.crops.${crop.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : crop;
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{t('farm.title')}</h1>

      {/* Farm Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{t('farm.farmName')}</label>
        <input
          type="text"
          value={form.farmName}
          onChange={(e) => update('farmName', e.target.value)}
          placeholder="My Farm"
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{language === 'en' ? 'City/Village' : 'शहर/गाँव'}</label>
          <input
            type="text"
            value={form.location.city}
            onChange={(e) => update('location', { ...form.location, city: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{language === 'en' ? 'State' : 'राज्य'}</label>
          <input
            type="text"
            value={form.location.state}
            onChange={(e) => update('location', { ...form.location, state: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
      </div>

      {/* Crop */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{t('farm.crop')}</label>
        <div className="grid grid-cols-5 gap-2">
          {CROPS.map((crop) => (
            <button
              key={crop}
              onClick={() => update('crop', crop)}
              className={`px-2 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                form.crop === crop
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary-300'
              }`}
            >
              {getCropLabel(crop)}
            </button>
          ))}
        </div>
      </div>

      {/* Crop Stage */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{t('farm.cropStage')}</label>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => update('cropStage', stage)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                form.cropStage === stage
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary-300'
              }`}
            >
              {t(`farm.stages.${stage}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Area */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{t('farm.area')}</label>
          <input
            type="number"
            value={form.area}
            onChange={(e) => update('area', e.target.value)}
            placeholder="2.5"
            min="0"
            step="0.1"
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">&nbsp;</label>
          <select
            value={form.areaUnit}
            onChange={(e) => update('areaUnit', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400"
          >
            <option value="acres">Acres</option>
            <option value="hectares">Hectares</option>
            <option value="bigha">Bigha</option>
          </select>
        </div>
      </div>

      {/* Soil Type */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">{t('farm.soilType')}</label>
        <input
          type="text"
          value={form.soilType}
          onChange={(e) => update('soilType', e.target.value)}
          placeholder={language === 'en' ? 'e.g., Alluvial, Black, Red' : 'जैसे, जलोढ़, काली, लाल'}
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-primary-400"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors cursor-pointer border-none disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {loading ? t('farm.saving') : t('farm.save')}
      </button>
    </div>
  );
}
