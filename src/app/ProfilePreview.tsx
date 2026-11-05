import { ShieldCheck } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { DemoSession } from '../domain';

const profiles: readonly DemoSession['profile'][] = ['Equipe', 'Chefia', 'Gestão'];

export default function ProfilePreview({
  session,
  setSession,
}: {
  session: DemoSession;
  setSession: Dispatch<SetStateAction<DemoSession>>;
}) {
  return (
    <div className="profile-preview">
      <span>
        <ShieldCheck size={14} />
        Prévia de perfil
      </span>
      <select
        aria-label="Prévia de perfil"
        value={session.profile}
        onChange={(event) => {
          const profile = profiles.find((value) => value === event.target.value);
          if (profile) setSession((current) => ({ ...current, profile }));
        }}
      >
        {profiles.map((profile) => (
          <option key={profile}>{profile}</option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={session.admin}
          onChange={(e) => setSession((current) => ({ ...current, admin: e.target.checked }))}
        />
        Prévia administrativa
      </label>
      <small>Permissões demonstrativas · dados fictícios</small>
    </div>
  );
}
