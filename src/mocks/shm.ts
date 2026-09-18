import { SHMResult } from "@/types/shm";

export const mockSHMResult: SHMResult = {
  type: "shm",
  files: [
    { fileId: "test01.csv", prediction: 0.0342 },
    { fileId: "test02.csv", prediction: 0.0518 },
    { fileId: "test03.csv", prediction: 0.0287 },
    { fileId: "test04.csv", prediction: 0.0431 },
    { fileId: "test05.csv", prediction: 0.0396 },
    { fileId: "test06.csv", prediction: 0.0475 },
  ],
};
