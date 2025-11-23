'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function PerformerProfileForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    specialization: '',
    skills: [] as string[],
    bio: '',
    rate: 0,
    employmentType: 'contract',
    isPublic: false
  });
  
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetch('/api/me/performer-profile')
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setFormData({
            specialization: data.profile.specialization || '',
            skills: Array.isArray(data.profile.skills) ? data.profile.skills : [],
            bio: data.profile.bio || '',
            rate: data.profile.rate || 0,
            employmentType: data.profile.employmentType || 'contract',
            isPublic: data.profile.isPublic || false
          });
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/me/performer-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save profile');

      setMessage({ type: 'success', text: 'Профиль успешно обновлен' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Ошибка при сохранении профиля' });
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return;
    e?.preventDefault();
    
    const skill = skillInput.trim();
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  if (isLoading) return <div>Загрузка профиля...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[color:var(--text-primary)]">Основная информация</h3>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Специализация</label>
          <Input 
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            placeholder="Например: Frontend Developer"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">Навыки</label>
          <div className="flex gap-2">
            <Input 
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={addSkill}
              placeholder="Введите навык и нажмите Enter"
            />
            <Button type="button" onClick={() => addSkill()} variant="secondary">Добавить</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map(skill => (
              <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-indigo-900">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text-secondary)]">О себе</label>
          <Textarea 
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Расскажите о своем опыте и проектах..."
            rows={5}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[color:var(--text-primary)]">Условия работы</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[color:var(--text-secondary)]">Ставка ($/ч)</label>
            <Input 
              type="number"
              min="0"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-[color:var(--text-secondary)]">Тип занятости</label>
            <select 
              className="flex h-10 w-full rounded-md border border-[color:var(--surface-border-strong)] bg-[color:var(--surface-base)] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.employmentType}
              onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
            >
              <option value="fulltime">Полная занятость</option>
              <option value="parttime">Частичная занятость</option>
              <option value="contract">Проектная работа</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[color:var(--surface-border-subtle)] bg-[color:var(--surface-muted)] p-4">
        <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <label htmlFor="isPublic" className="font-medium text-[color:var(--text-primary)]">Публичный профиль</label>
              <p className="text-sm text-[color:var(--text-secondary)]">
                Ваш профиль будет виден в каталоге исполнителей, и вас смогут приглашать в проекты.
              </p>
            </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
        </Button>
      </div>
    </form>
  );
}

