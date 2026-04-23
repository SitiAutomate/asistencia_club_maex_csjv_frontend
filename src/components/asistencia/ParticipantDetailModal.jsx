import {
  getCursoNombre,
  getDocumento,
  getGrupo,
  getNombreCompleto,
  getParticipante,
  getRutaLabel,
} from '../../lib/inscritoHelpers.js';
import { mailtoHref, telHref, whatsappHref } from '../../lib/phoneLinks.js';
import { IconWhatsApp } from './AttendanceIcons.jsx';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return String(iso);
  }
}

function InfoRow({ label, children }) {
  return (
    <div className="att-info-row">
      <div className="att-info-label">{label}:</div>
      <div className="att-info-value">{children || '—'}</div>
    </div>
  );
}

export function ParticipantDetailModal({ open, onClose, inscrito }) {
  if (!open || !inscrito) return null;

  const p = getParticipante(inscrito);
  const padre = p?.padreInfo;
  const resp = p?.responsableInfo;
  const sede = inscrito?.Sede || inscrito?.sede || '—';

  const celularResp = resp?.Celular_Responsable || resp?.celular_responsable;
  const wa = whatsappHref(celularResp);
  const tel = telHref(celularResp);
  const mail = mailtoHref(resp?.Correo_Responsable || resp?.correo_responsable);

  return (
    <div
      className="att-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="att-modal" style={{ maxWidth: '48rem' }} onClick={(e) => e.stopPropagation()}>
        <div className="att-modal__head d-flex align-items-center justify-content-between gap-2">
          <h2 id="detalle-title" className="att-modal__title">
            Información Participante
          </h2>
          <button type="button" className="att-modal__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="att-modal__body">
          <div className="att-info-grid">
            <InfoRow label="Nombre">{getNombreCompleto(inscrito)}</InfoRow>
            <InfoRow label="Documento">{getDocumento(inscrito)}</InfoRow>
            <InfoRow label="Fecha de Nacimiento">{formatDate(p?.fechaNacimiento)}</InfoRow>
            <InfoRow label="Curso">{getCursoNombre(inscrito)}</InfoRow>
            <InfoRow label="Grupo">{getGrupo(inscrito)}</InfoRow>
            <InfoRow label="Ruta">{getRutaLabel(inscrito)}</InfoRow>
            <InfoRow label="Sede">{sede}</InfoRow>
          </div>

          <h3 className="att-section-title">Información Padres</h3>
          <hr className="att-section-divider" />
          <div className="att-info-grid">
            <InfoRow label="Madre">{padre?.nombreMadre || '—'}</InfoRow>
            <InfoRow label="Celular madre">
              {padre?.celularMadre ? (
                <span className="att-link-row">
                  {telHref(padre.celularMadre) ? (
                    <a href={telHref(padre.celularMadre)} className="text-decoration-none">
                      {padre.celularMadre}
                    </a>
                  ) : (
                    padre.celularMadre
                  )}
                  {whatsappHref(padre.celularMadre) ? (
                    <a
                      href={whatsappHref(padre.celularMadre)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="att-wa"
                      aria-label="WhatsApp madre"
                    >
                      <IconWhatsApp />
                    </a>
                  ) : null}
                </span>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow label="Email madre">
              {padre?.emailMadre && mailtoHref(padre.emailMadre) ? (
                <a href={mailtoHref(padre.emailMadre)}>{padre.emailMadre}</a>
              ) : (
                padre?.emailMadre || '—'
              )}
            </InfoRow>
            <InfoRow label="Padre">{padre?.nombrePadre || '—'}</InfoRow>
            <InfoRow label="Celular padre">
              {padre?.celularPadre ? (
                <span className="att-link-row">
                  {telHref(padre.celularPadre) ? (
                    <a href={telHref(padre.celularPadre)} className="text-decoration-none">
                      {padre.celularPadre}
                    </a>
                  ) : (
                    padre.celularPadre
                  )}
                  {whatsappHref(padre.celularPadre) ? (
                    <a
                      href={whatsappHref(padre.celularPadre)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="att-wa"
                      aria-label="WhatsApp padre"
                    >
                      <IconWhatsApp />
                    </a>
                  ) : null}
                </span>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow label="Email padre">
              {padre?.emailPadre && mailtoHref(padre.emailPadre) ? (
                <a href={mailtoHref(padre.emailPadre)}>{padre.emailPadre}</a>
              ) : (
                padre?.emailPadre || '—'
              )}
            </InfoRow>
            <InfoRow label="Responsable">
              {resp?.Nombre_Completo || resp?.nombre_completo || padre?.nombreMadre || padre?.nombrePadre || '—'}
            </InfoRow>
            <InfoRow label="Celular responsable">
              <span className="att-link-row">
                {tel ? (
                  <a href={tel} className="text-decoration-none fw-semibold">
                    {celularResp}
                  </a>
                ) : (
                  <span>{celularResp || '—'}</span>
                )}
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="att-wa"
                    title="WhatsApp"
                    aria-label="Abrir WhatsApp"
                  >
                    <IconWhatsApp />
                  </a>
                ) : null}
              </span>
            </InfoRow>
            <InfoRow label="Email responsable">
              {mail ? (
                <a href={mail} className="text-decoration-none">
                  {resp?.Correo_Responsable || resp?.correo_responsable}
                </a>
              ) : (
                <span>{resp?.Correo_Responsable || resp?.correo_responsable || '—'}</span>
              )}
            </InfoRow>
          </div>
        </div>
      </div>
    </div>
  );
}
