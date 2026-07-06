import { useState } from 'react';
import { authApi } from '@/api/client';
import api from '@/api/client';
import { useAuthStore } from '@/context/authStore';
import { UserCircle, Camera, Upload, KeyRound, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const photoUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  return base ? base + url : url;
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore() as any;
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ? photoUrl(user.avatarUrl) : null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const roleLabel: Record<string, string> = { ADMIN: 'Administrator', EMPLOYEE: 'Hodim', INSPECTOR: 'Tekshiruvchi' };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const r = new FileReader();
      r.onload = () => setAvatarPreview(r.result as string);
      r.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingProfile(true);
    try {
      let avatarUrl = user?.avatarUrl;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        avatarUrl = res.data.data.url;
      }
      const res = await authApi.updateMe({ fullName: form.fullName, phone: form.phone, avatarUrl });
      // Auth store'ni yangilaymiz
      if (setUser) setUser({ ...user, ...res.data.data });
      toast.success('Profil yangilandi');
    } catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('Yangi parollar bir xil emas');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Yangi parol kamida 6 ta belgi');
      return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword(pwForm.oldPassword, pwForm.newPassword);
      toast.success("Parol o'zgartirildi. Qayta kiring.");
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
      // Parol o'zgargach barcha refresh tokenlar bekor bo'ladi — logout
      setTimeout(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }, 1500);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Xatolik'); }
    finally { setSavingPw(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <UserCircle className="w-7 h-7 text-blue-600" /> Mening profilim
      </h1>

      <div className="space-y-6">
        {/* Profil ma'lumotlari */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Shaxsiy ma'lumotlar</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4">
              {avatarPreview
                ? <img src={avatarPreview} className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
                : <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl">{user?.fullName?.charAt(0)?.toUpperCase() || <Camera className="w-7 h-7 text-gray-400" />}</div>}
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs cursor-pointer hover:bg-blue-100 text-blue-700">
                  <Upload className="w-3.5 h-3.5" /> Rasm yuklash
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                <div className="text-xs text-gray-400 mt-1.5">JPG, PNG — 5MB gacha</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">To'liq ism</label>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required minLength={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998..." className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-gray-50 rounded-lg p-4">
              <div><span className="text-xs text-gray-500">Email</span><div className="font-medium">{user?.email}</div></div>
              <div><span className="text-xs text-gray-500">Rol</span><div className="font-medium">{roleLabel[user?.role || ''] || user?.role}</div></div>
              <div><span className="text-xs text-gray-500">Hudud</span><div className="font-medium">{user?.region?.name || 'Barchasi'}</div></div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={savingProfile} className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {savingProfile ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>

        {/* Parol o'zgartirish */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-1 flex items-center gap-2"><KeyRound className="w-5 h-5 text-amber-500" /> Parolni o'zgartirish</h2>
          <p className="text-xs text-gray-500 mb-4">Parol o'zgartirilgach, barcha qurilmalarda qayta kirish talab qilinadi</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Joriy parol *</label>
                <input type="password" value={pwForm.oldPassword} onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))} required className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Yangi parol *</label>
                <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Yangi parol (takror) *</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required minLength={6} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingPw} className="px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
                {savingPw ? '...' : "Parolni o'zgartirish"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
