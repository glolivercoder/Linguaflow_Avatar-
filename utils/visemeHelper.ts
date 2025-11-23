/**
 * Helper function to apply viseme changes to an SVG avatar
 * Maps Azure Speech SDK viseme IDs (0-20) to SVG groups
 */

export function applyVisemeToSvg(svgElement: SVGSVGElement, visemeId: number): void {
    if (!svgElement) return;

    // Hide all mouth groups
    const allMouthGroups = svgElement.querySelectorAll('[id^="mouth-"]');
    allMouthGroups.forEach((group) => {
        (group as SVGElement).style.display = 'none';
    });

    // Show the specific viseme group
    const targetGroup = svgElement.querySelector(`#mouth-${visemeId}`);
    if (targetGroup) {
        (targetGroup as SVGElement).style.display = 'block';
    }
}

/**
 * Azure Speech SDK Viseme IDs mapping:
 * 0 = Silence
 * 1 = AA (as in "father")
 * 2 = AE (as in "cat")
 * 3 = AH (as in "but")
 * 4 = AO (as in "caught")
 * 5 = AW (as in "cow")
 * 6 = AY (as in "hide")
 * 7 = EH (as in "bed")
 * 8 = ER (as in "bird")
 * 9 = EY (as in "ate")
 * 10 = IH (as in "sit")
 * 11 = IY (as in "eat")
 * 12 = OW (as in "go")
 * 13 = OY (as in "boy")
 * 14 = UH (as in "book")
 * 15 = UW (as in "too")
 * 16 = B, P, M
 * 17 = F, V
 * 18 = TH (as in "thing")
 * 19 = T, D, N, L, S, Z
 * 20 = K, G, NG, CH, SH, ZH, J
 */
