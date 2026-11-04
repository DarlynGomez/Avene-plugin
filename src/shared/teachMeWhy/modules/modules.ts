import module01 from "./M01.json";
import module02 from "./M02.json";
import module03 from "./M03.json";
import module04 from "./M04.json";
import module05 from "./M05.json";
import module06 from "./M06.json";
import module07 from "./M07.json";
import module08 from "./M08.json";
import module09 from "./M09.json";
import module10 from "./M10.json";
import type { LearningModule } from "./moduleTypes";

export const LEARNING_MODULES = [
  module01,
  module02,
  module03,
  module04,
  module05,
  module06,
  module07,
  module08,
  module09,
  module10
] satisfies LearningModule[];
