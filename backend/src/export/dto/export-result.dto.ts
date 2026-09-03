export interface ExportedFileInfo {
  filename: string;
  absolutePath: string;
  /** Ruta de la carpeta que contiene el archivo en el NAS */
  folderPath: string;
  mimeType: string;
}

export interface ProformaExportResult {
  idProforma: string;
  nombreProyecto: string;
  /** Carpeta base de la proforma en el NAS */
  folderPath: string;
  excel?: ExportedFileInfo;
  pdf?: ExportedFileInfo;
  status: string;
}
