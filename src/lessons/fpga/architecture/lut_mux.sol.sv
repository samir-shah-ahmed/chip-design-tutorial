module lut_mux(
  input [1:0] sel,
  input a, b, c, d,
  output y
);
  assign y = (sel == 2'd0) ? a :
             (sel == 2'd1) ? b :
             (sel == 2'd2) ? c : d;
endmodule
