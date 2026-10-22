module lut_mux(
  input [1:0] sel,
  input a, b, c, d,
  output y
);
  // TODO: 4:1 mux. A 4-input LUT can hold any function of these five bits? No:
  // a 4-LUT has four inputs. This mux has six inputs, so it will not fit in one LUT4.
  // Implement it anyway; the point of the lesson is to see what the fabric maps.
  assign y = 1'b0;
endmodule
