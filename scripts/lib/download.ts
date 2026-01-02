import JSZip from "jszip";

/**
 * ZIP 파일 다운로드 및 압축 해제
 */
export async function downloadAndUnzip(url: string): Promise<Buffer> {
  console.log(`  다운로드 중: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`다운로드 실패: ${url} (${response.status})`);
  }
  const zipBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);

  // ZIP 내 첫 번째 파일 추출 (디렉토리 제외)
  const fileNames = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir,
  );
  if (fileNames.length === 0) {
    throw new Error(`ZIP 파일이 비어있음: ${url}`);
  }

  const firstFile = zip.files[fileNames[0]];
  const content = await firstFile.async("nodebuffer");
  return content;
}
